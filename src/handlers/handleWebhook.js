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
    console.log('Received Webhook Event:', event);

    try {
        const webhookSecret = getWebhookSecret();

        const body = JSON.parse(event.body);
        console.log('Webhook Body:', body);
        console.log('Webhook Headers:', event.headers);

        // Genera un UUID per questo webhook
        const uuid = uuidv4();
        body.uuid = uuid;  // Aggiunge l'UUID al body

        console.log(`Generated UUID: ${uuid} for this webhook.`);

        // Verifica la firma del webhook
        if (event.headers['signature'] !== webhookSecret) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    message: 'Unauthorized',
                }),
            };
        }

        // Invia i dati alla coda SQS per l'elaborazione
        await sendMessageToQueue(body);
        console.log(`Webhook data sent to SQS with UUID: ${uuid}`);

        // Risponde con 200 OK
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Webhook received and queued for processing.',
                uuid: uuid,  // Restituisce l'UUID nella risposta
            }),
        };
    } catch (error) {
        console.error('Error processing webhook:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal Server Error',
            }),
        };
    }
};