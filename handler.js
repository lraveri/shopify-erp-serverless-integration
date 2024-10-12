'use strict';

const AWS = require('aws-sdk');

module.exports.webhook = async (event) => {
  console.log('Received Webhook Event:', event);

  try {
    // Log the body of the event (webhook data)
    const body = JSON.parse(event.body);
    console.log('Webhook Body:', body);

    // Log the headers for authentication check
    console.log('Webhook Headers:', event.headers);

    // Additional logic goes here (e.g., authentication, saving to DynamoDB)

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Webhook received and processed!',
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
