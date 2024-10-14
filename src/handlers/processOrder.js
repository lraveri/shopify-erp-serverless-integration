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
    console.log('Received Order Event:', event);

    try {
        const records = event.Records;

        for (const record of records) {
            const messageBody = JSON.parse(record.body);
            const orderId = messageBody.orderId;
            const uuid = messageBody.uuid;  // Recupera l'UUID passato dal webhook

            console.log(`Processing order with UUID: ${uuid} - Order ID: ${orderId}`);

            const orderExists = await checkOrderExists(orderId);

            if (orderExists) {
                console.log(`Order ${orderId} already processed, skipping (UUID: ${uuid}).`);
                continue;
            }

            // Salva l'ordine nella tabella DynamoDB
            await saveOrder(orderId);
            console.log(`Order ${orderId} saved to DynamoDB (UUID: ${uuid}).`);

            // Logica di elaborazione dell'ordine (aggiungi la tua logica qui)
            console.log(`Order processing logic for UUID: ${uuid}`);

            // Elimina il messaggio dalla coda SQS
            const deleteParams = {
                QueueUrl: process.env.ORDER_QUEUE_URL,
                ReceiptHandle: record.receiptHandle,
            };
            await sqs.deleteMessage(deleteParams).promise();
            console.log(`SQS Message deleted for UUID: ${uuid}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Order processed successfully.',
            }),
        };
    } catch (error) {
        console.error('Error processing order:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal Server Error',
            }),
        };
    }
};