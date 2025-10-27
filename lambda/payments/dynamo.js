const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

// Use region from env; fallback to us-east-1
const REGION = process.env.AWS_REGION || 'us-east-1';

let docClient;
function getDocClient() {
  if (!docClient) {
    const native = new DynamoDBClient({ region: REGION });
    docClient = DynamoDBDocumentClient.from(native, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return docClient;
}

async function logPaymentEvent(tableName, item) {
  if (!tableName) return; // no-op if not configured
  const client = getDocClient();
  const command = new PutCommand({
    TableName: tableName,
    Item: item,
  });
  await client.send(command);
}

module.exports = { logPaymentEvent };

