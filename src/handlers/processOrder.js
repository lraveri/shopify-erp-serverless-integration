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
    const records = event.Records;

    for (const record of records) {
        try {
            const messageBody = JSON.parse(record.body);
            const orderId = messageBody.orderId;
            const uuid = messageBody.uuid;

            console.log(JSON.stringify({
                message: 'Processing order',
                record: record,
                uuid: uuid,
            }));

            const orderExists = await checkOrderExists(orderId);

            if (orderExists) {
                console.log(JSON.stringify({
                    message: `Order ${orderId} already processed, skipping (UUID: ${uuid}).`,
                    record: record,
                    uuid: uuid,
                }));
                continue;
            }

            await saveOrder(orderId);
            console.log(JSON.stringify({
                message: `Order ${orderId} saved to DynamoDB (UUID: ${uuid}).`,
                record: record,
                uuid: uuid,
            }));

            console.log(JSON.stringify({
                message: `Order processing logic for UUID: ${uuid}`,
                record: record,
                uuid: uuid,
            }));

            const deleteParams = {
                QueueUrl: process.env.ORDER_QUEUE_URL,
                ReceiptHandle: record.receiptHandle,
            };
            await sqs.deleteMessage(deleteParams).promise();
            console.log(JSON.stringify({
                message: `SQS Message deleted for UUID: ${uuid}`,
                record: record,
                uuid: uuid,
            }));

        } catch (error) {
            console.error(JSON.stringify({
                message: 'Error processing record',
                record: record,
                error: error.message,
                uuid: record.uuid || 'UUID not available'
            }));
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Records processed successfully.',
        }),
    };
};