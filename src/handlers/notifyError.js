'use strict';

const AWS = require('aws-sdk');
const sns = new AWS.SNS();
const zlib = require('zlib');

module.exports.handler = async (event) => {
    try {
        const logData = Buffer.from(event.awslogs.data, 'base64');
        const decompressedData = zlib.gunzipSync(logData);
        const logString = decompressedData.toString('utf8');

        const parsedLog = JSON.parse(logString);
        const parsedMessage = JSON.parse(parsedLog.logEvents[0].message);

        const errorMessage = parsedMessage.message.message;
        const orderId = parsedMessage.message.orderId;
        const uuid = parsedMessage.message.uuid;

        const params = {
            Message: `Error detected with UUID: ${uuid}\n\nError message: ${errorMessage}\n\nOrder ID: ${orderId}`,
            Subject: `Error Lambda ProcessOrder - Order ID: ${orderId}`,
            TopicArn: process.env.ERROR_ALERT_TOPIC_ARN,
        };

        await sns.publish(params).promise();
        console.log({
            message: `Notification sent for UUID: ${uuid} and error: ${errorMessage}`,
            uuid: uuid,
            orderId: orderId,
        });
    } catch (error) {
        console.error('Error processing log event:', error);
    }
};
