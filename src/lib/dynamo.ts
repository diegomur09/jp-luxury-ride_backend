import { v4 as uuidv4 } from 'uuid'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const REGION = process.env.AWS_REGION || 'us-east-1'

let docClient: any
function getClient() {
  if (!docClient) {
    const native = new DynamoDBClient({ region: REGION })
    docClient = DynamoDBDocumentClient.from(native, { marshallOptions: { removeUndefinedValues: true } })
  }
  return docClient
}

// Local-file fallback for dev when DYNAMO_USERS_TABLE is not configured.
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const AUTH_FILE = path.resolve(process.cwd(), '.data', 'auth.json')

async function ensureAuthFile() {
  const dir = path.dirname(AUTH_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(AUTH_FILE)) {
    await writeFile(AUTH_FILE, JSON.stringify({}), 'utf8')
  }
}

async function readAuthStore(): Promise<Record<string, any>> {
  await ensureAuthFile()
  const raw = await readFile(AUTH_FILE, 'utf8')
  try {
    return JSON.parse(raw || '{}')
  } catch (e) {
    return {}
  }
}

async function writeAuthStore(obj: Record<string, any>) {
  await ensureAuthFile()
  await writeFile(AUTH_FILE, JSON.stringify(obj, null, 2), 'utf8')
}

export async function getAuthRecordByEmail(table: string | undefined, email: string) {
  if (!table) {
    // dev fallback to file
    const store = await readAuthStore()
    return store[email] || null
  }
  // Use GSI for efficient email lookup
  const cmd = new QueryCommand({
    TableName: table,
    IndexName: 'email-index',
    KeyConditionExpression: '#email = :email',
    ExpressionAttributeNames: { '#email': 'email' },
    ExpressionAttributeValues: { ':email': email },
    Limit: 1,
  })
  const out = await getClient().send(cmd)
  return (out.Items && out.Items[0]) || null
}

export async function putAuthRecord(table: string | undefined, record: any) {
  if (!table) {
    // dev fallback to file
    const store = await readAuthStore()
    const item = { id: record.id || uuidv4(), ...record }
    store[item.email] = item
    await writeAuthStore(store)
    return
  }
  const item = { id: record.id || uuidv4(), ...record }
  const cmd = new PutCommand({ TableName: table, Item: item })
  await getClient().send(cmd)
}

// User profile operations (DynamoDB-backed). These expect a table with PK 'id'.
export async function getUserProfileById(table: string, id: string) {
  const cmd = new GetCommand({ TableName: table, Key: { id } })
  const out = await getClient().send(cmd)
  return out.Item || null
}

export async function putUserProfile(table: string, user: any) {
  const cmd = new PutCommand({ TableName: table, Item: user })
  await getClient().send(cmd)
}

export async function deleteUserProfileById(table: string, id: string) {
  const cmd = new DeleteCommand({ TableName: table, Key: { id } })
  await getClient().send(cmd)
}

// Driver profile operations (optional)
export async function putDriverProfile(table: string, profile: any) {
  const cmd = new PutCommand({ TableName: table, Item: profile })
  await getClient().send(cmd)
}

export async function scanUsers(table: string, limit = 25, exclusiveStartKey?: Record<string, any>) {
  const cmd = new ScanCommand({ TableName: table, Limit: limit, ExclusiveStartKey: exclusiveStartKey })
  const out = await getClient().send(cmd)
  return { items: out.Items || [], lastEvaluatedKey: out.LastEvaluatedKey }
}

// Payment operations (DynamoDB-backed). These expect a table with PK 'id'.
export async function createPayment(table: string, payment: any) {
  // Accept and persist provider payment IDs if present
  const item = { ...payment, id: payment.id || uuidv4(), createdAt: new Date().toISOString() }
  const cmd = new PutCommand({ TableName: table, Item: item })
  await getClient().send(cmd)
  return item
}

export async function getPaymentById(table: string, id: string) {
  const cmd = new GetCommand({ TableName: table, Key: { id } })
  const out = await getClient().send(cmd)
  return out.Item || null
}

export async function scanPayments(table: string, limit = 25, exclusiveStartKey?: Record<string, any>) {
  const cmd = new ScanCommand({ TableName: table, Limit: limit, ExclusiveStartKey: exclusiveStartKey })
  const out = await getClient().send(cmd)
  return { items: out.Items || [], lastEvaluatedKey: out.LastEvaluatedKey }
}

export async function deletePaymentById(table: string, id: string) {
  const cmd = new DeleteCommand({ TableName: table, Key: { id } })
  await getClient().send(cmd)
}

// Booking operations (DynamoDB-backed). These expect a table with PK 'id'.
export async function createBooking(table: string, booking: any) {
  const item = { ...booking, id: booking.id || uuidv4(), createdAt: new Date().toISOString() }
  const cmd = new PutCommand({ TableName: table, Item: item })
  await getClient().send(cmd)
  return item
}

export async function getBookingById(table: string, id: string) {
  const cmd = new GetCommand({ TableName: table, Key: { id } })
  const out = await getClient().send(cmd)
  return out.Item || null
}

export async function scanBookings(table: string, limit = 25, exclusiveStartKey?: Record<string, any>) {
  const cmd = new ScanCommand({ TableName: table, Limit: limit, ExclusiveStartKey: exclusiveStartKey })
  const out = await getClient().send(cmd)
  return { items: out.Items || [], lastEvaluatedKey: out.LastEvaluatedKey }
}

export async function deleteBookingById(table: string, id: string) {
  const cmd = new DeleteCommand({ TableName: table, Key: { id } })
  await getClient().send(cmd)
}
