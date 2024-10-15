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

        const errorMessage = parsedLog.logEvents[0].message;

        const uuidMatch = errorMessage.match(/"uuid":"([\w-]+)"/);
        const extractedUUID = uuidMatch ? uuidMatch[1] : 'UUID not found';

        const errorMatch = errorMessage.match(/"error":"(.*?)"/);
        const extractedError = errorMatch ? errorMatch[1] : 'Error message not found';

        const params = {
            Message: `Error detected with UUID: ${extractedUUID}\n\nError message: ${extractedError}`,
            Subject: `Error Lambda ProcessOrder - UUID: ${extractedUUID}`,
            TopicArn: process.env.ERROR_ALERT_TOPIC_ARN,
        };

        await sns.publish(params).promise();
        console.log({
            message: `Notification sent for UUID: ${extractedUUID} and error: ${extractedError}`,
            uuid: uuidMatch
        });
    } catch (error) {
        console.error('Error processing log event:', error);
    }
};
