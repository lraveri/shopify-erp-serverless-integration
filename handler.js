'use strict';

const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

const getWebhookSecret = async () => {
  return process.env.WEBHOOK_SIGNATURE;
};

module.exports.webhook = async (event) => {
  console.log('Received Webhook Event:', event);

  try {
    const webhookSecret = getWebhookSecret();
    console.log('Webhook Secret:', webhookSecret);

    // Log the body of the event (webhook data)
    const body = JSON.parse(event.body);
    console.log('Webhook Body:', body);

    // Log the headers for authentication check
    console.log('Webhook Headers:', event.headers);

    // Additional logic goes here (e.g., authentication, saving to DynamoDB)
    if(event.headers['signature'] !== webhookSecret) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            message: 'Unauthorized',
          }),
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Webhook received and processed! ' + webhookSecret,
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
