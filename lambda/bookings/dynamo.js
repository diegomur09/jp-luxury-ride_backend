const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = process.env.AWS_REGION || 'us-east-1';

let docClient;
function client() {
  if (!docClient) {
    const native = new DynamoDBClient({ region: REGION });
    docClient = DynamoDBDocumentClient.from(native, { marshallOptions: { removeUndefinedValues: true } });
  }
  return docClient;
}

async function createBooking(table, item) {
  await client().send(new PutCommand({ TableName: table, Item: item }));
  return item;
}

async function listBookings(table, userId) {
  const cmd = new QueryCommand({
    TableName: table,
    KeyConditionExpression: '#pk = :pk',
    ExpressionAttributeNames: { '#pk': 'pk' },
    ExpressionAttributeValues: { ':pk': `USER#${userId}` },
    ScanIndexForward: false,
  });
  const res = await client().send(cmd);
  return res.Items || [];
}

module.exports = { createBooking, listBookings };

