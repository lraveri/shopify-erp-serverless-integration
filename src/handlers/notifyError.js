'use strict';

const AWS = require('aws-sdk');
const sns = new AWS.SNS();
const zlib = require('zlib');

module.exports.handler = async (event) => {
    const logData = Buffer.from(event.awslogs.data, 'base64');
    const decompressedData = zlib.gunzipSync(logData);
    const logString = decompressedData.toString('utf8');
    const parsedLog = JSON.parse(logString);
    const errorMessage = parsedLog.logEvents[0].message;

    const uuidMatch = errorMessage.match(/UUID: (\w+-\w+-\w+-\w+-\w+)/);
    const uuid = uuidMatch ? uuidMatch[1] : 'UUID non trovato';

    const params = {
        Message: `Errore rilevato con UUID: ${uuid}\n\nMessaggio di errore: ${errorMessage}`,
        Subject: `Errore Lambda ProcessOrder - UUID: ${uuid}`,
        TopicArn: process.env.ERROR_ALERT_TOPIC_ARN,
    };

    await sns.publish(params).promise();
};
