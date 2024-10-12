'use strict';

const AWS = require('aws-sdk');
const sqs = new AWS.SQS();

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

module.exports.processOrder = async (event) => {
    console.log('Received Order Event:', event);

    try {
        const records = event.Records;
        console.log('SQS Records:', records);

        // Elabora ogni record ricevuto
        for (const record of records) {
        const messageBody = JSON.parse(record.body);
        console.log('SQS Message Body:', messageBody);

        // Simula l'elaborazione dell'ordine
        console.log('Processing order:', messageBody);

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
}

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

    // Invia i dati alla coda SQS per elaborazione
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
