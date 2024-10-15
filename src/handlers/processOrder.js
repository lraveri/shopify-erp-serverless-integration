'use strict';

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

const saveOrder = async (orderId) => {
    const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

    const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
            orderId: orderId,
            timestamp: new Date().toISOString(),
            ttl: ttl,
        },
    };
    await dynamodb.put(params).promise();
};

const checkOrderExists = async (orderId) => {
    const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
            orderId: orderId,
        },
    };
    const result = await dynamodb.get(params).promise();
    return result.Item !== undefined;
};

module.exports.handler = async (event) => {
    const record = event.Records[0];

    try {
        const messageBody = JSON.parse(record.body);
        const orderId = messageBody.orderId;
        const uuid = messageBody.uuid;

        console.log({
            message: 'Processing order',
            uuid: uuid,
            orderId: orderId,
        });

        const orderExists = await checkOrderExists(orderId);

        if (orderExists) {
            console.log({
                message: `Order ${orderId} already processed, skipping (UUID: ${uuid}).`,
                uuid: uuid,
                orderId: orderId,
            });
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: `Order ${orderId} already processed, skipping.`,
                }),
            };
        }

        await saveOrder(orderId);
        console.log({
            message: `Order ${orderId} saved to DynamoDB (UUID: ${uuid}).`,
            uuid: uuid,
            orderId: orderId,
        });

        console.log({
            message: `Order processing logic for UUID: ${uuid}`,
            uuid: uuid,
            orderId: orderId,
        });

        const deleteParams = {
            QueueUrl: process.env.ORDER_QUEUE_URL,
            ReceiptHandle: record.receiptHandle,
        };
        await sqs.deleteMessage(deleteParams).promise();
        console.log({
            message: `SQS Message deleted for UUID: ${uuid}`,
            uuid: uuid,
            orderId: orderId,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Order processed successfully.',
            }),
        };

    } catch (error) {
        const messageBody = JSON.parse(record.body);
        const uuid = messageBody.uuid;
        console.error({
            message: 'Error processing order',
            uuid: uuid || 'UUID not available',
            orderId: messageBody.orderId || 'OrderId not available',
            error: error.message,
        });

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal Server Error',
                error: error.message,
                uuid: uuid || 'UUID not available',
                orderId: messageBody.orderId || 'OrderId not available'
            }),
        };
    }
};
