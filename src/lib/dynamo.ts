import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
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
  const cmd = new GetCommand({ TableName: table, Key: { email } })
  const out = await getClient().send(cmd)
  return out.Item || null
}

export async function putAuthRecord(table: string | undefined, record: any) {
  if (!table) {
    // dev fallback to file
    const store = await readAuthStore()
    store[record.email] = record
    await writeAuthStore(store)
    return
  }
  const cmd = new PutCommand({ TableName: table, Item: record })
  await getClient().send(cmd)
}
