'use strict';

const AWS = require('aws-sdk');
const sqs = new AWS.SQS();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Funzione per ottenere il segreto dal process.env
const getWebhookSecret = () => {
    return process.env.WEBHOOK_SIGNATURE;
};

// Funzione per inviare il messaggio alla coda SQS
const sendMessageToQueue = async (messageBody) => {
    const params = {
        QueueUrl: process.env.ORDER_QUEUE_URL,  // La coda SQS creata nel serverless.yml
        MessageBody: JSON.stringify(messageBody),
    };
    await sqs.sendMessage(params).promise();
};

// Funzione per controllare se l'ordine è già stato elaborato
const checkOrderExists = async (orderId) => {
    const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
            orderId: orderId,
        },
    };
    const result = await dynamodb.get(params).promise();
    return result.Item !== undefined;  // Restituisce `true` se l'ordine esiste già
};

// Funzione per salvare l'ordine in DynamoDB con TTL
const saveOrder = async (orderId) => {
    const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;  // Imposta il TTL a 30 giorni nel futuro

    const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
            orderId: orderId,
            timestamp: new Date().toISOString(),
            ttl: ttl,  // Aggiungi il campo TTL per l'eliminazione automatica
        },
    };
    await dynamodb.put(params).promise();
};

// Funzione che gestisce l'elaborazione dell'ordine
module.exports.processOrder = async (event) => {
    console.log('Received Order Event:', event);

    try {
        const records = event.Records;

        // Elabora ogni record ricevuto dalla coda SQS
        for (const record of records) {
            const messageBody = JSON.parse(record.body);
            const orderId = messageBody.orderId;

            console.log('Processing order:', messageBody);

            // Controlla se l'ordine esiste già nella tabella DynamoDB
            const orderExists = await checkOrderExists(orderId);

            if (orderExists) {
                console.log(`Order ${orderId} already processed, skipping.`);
                continue;
            }

            // Salva l'ordine nella tabella DynamoDB
            await saveOrder(orderId);
            console.log(`Order ${orderId} saved to DynamoDB.`);

            // Simula l'elaborazione dell'ordine (aggiungi la tua logica qui)
            console.log('Order processing logic...');

            // Elimina il messaggio dalla coda SQS
            const deleteParams = {
                QueueUrl: process.env.ORDER_QUEUE_URL,
                ReceiptHandle: record.receiptHandle,
            };
            await sqs.deleteMessage(deleteParams).promise();
            console.log('SQS Message deleted:', record.messageId);
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

// Funzione che gestisce il webhook e invia i dati alla coda SQS
module.exports.webhook = async (event) => {
    console.log('Received Webhook Event:', event);

    try {
        const webhookSecret = getWebhookSecret();
        console.log('Webhook Secret:', webhookSecret);

        const body = JSON.parse(event.body);
        console.log('Webhook Body:', body);
        console.log('Webhook Headers:', event.headers);

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
        console.log('Webhook data sent to SQS:', body);

        // Rispondi subito con 200 OK
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Webhook received and queued for processing.',
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
