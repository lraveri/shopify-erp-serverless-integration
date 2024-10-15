'use strict';

const AWS = require('aws-sdk');
const sqs = new AWS.SQS();
const { v4: uuidv4 } = require('uuid');

const sendMessageToQueue = async (messageBody) => {
    const params = {
        QueueUrl: process.env.ORDER_QUEUE_URL,
        MessageBody: JSON.stringify(messageBody),
    };
    await sqs.sendMessage(params).promise();
};

const getWebhookSecret = () => {
    return process.env.WEBHOOK_SIGNATURE;
};

module.exports.handler = async (event) => {
    const uuid = uuidv4();

    try {
        const webhookSecret = getWebhookSecret();

        const body = JSON.parse(event.body);

        console.log({
            message: 'Received Webhook Event',
            uuid: uuid,
            payload: body,
            headers: event.headers
        });

        body.uuid = uuid;

        if (event.headers['signature'] !== webhookSecret) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    message: 'Unauthorized',
                }),
            };
        }

        await sendMessageToQueue(body);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Webhook received and queued for processing.',
                uuid: uuid,
            }),
        };
    } catch (error) {
        console.error({
            message: 'Error processing webhook',
            error: error,
            uuid: uuid,
        });

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal Server Error',
            }),
        };
    }
};