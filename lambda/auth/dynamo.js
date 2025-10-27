const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = process.env.AWS_REGION || 'us-east-1';

let docClient;
function client() {
  if (!docClient) {
    const native = new DynamoDBClient({ region: REGION });
    docClient = DynamoDBDocumentClient.from(native, { marshallOptions: { removeUndefinedValues: true } });
  }
  return docClient;
}

async function getUserByEmail(table, email) {
  const cmd = new GetCommand({ TableName: table, Key: { email } });
  const out = await client().send(cmd);
  return out.Item || null;
}

async function putUser(table, user) {
  const cmd = new PutCommand({ TableName: table, Item: user, ConditionExpression: 'attribute_not_exists(email)' });
  await client().send(cmd);
}

module.exports = { getUserByEmail, putUser };

