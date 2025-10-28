// Script to insert a test user into DynamoDB users table
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import * as bcrypt from 'bcryptjs';

const REGION = process.env.AWS_REGION || 'us-east-2';
const USERS_TABLE = process.env.DYNAMO_USERS_TABLE || 'users';

async function main() {
  const client = new DynamoDBClient({ region: REGION });
  const email = 'test@example.com';
  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    email,
    passwordHash,
    role: 'user',
    createdAt: new Date().toISOString(),
  };
  const cmd = new PutCommand({ TableName: USERS_TABLE, Item: user });
  await client.send(cmd);
  console.log('Test user inserted:', { email, password });
}

main().catch(console.error);
