import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { v4 as uuidv4 } from 'uuid'

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const DATA_FILE = path.resolve(process.cwd(), '.data', 'users.json')

async function ensureFile() {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, JSON.stringify({ users: {} }, null, 2), 'utf8')
  }
}

async function readStore(): Promise<{ users: Record<string, any> }> {
  await ensureFile()
  const raw = await readFile(DATA_FILE, 'utf8')
  try {
    return JSON.parse(raw || '{"users":{}}')
  } catch (e) {
    return { users: {} }
  }
}
// Removed: devUserStore is no longer used after DynamoDB migration.
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { v4 as uuidv4 } from 'uuid'

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const DATA_FILE = path.resolve(process.cwd(), '.data', 'users.json')

async function ensureFile() {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, JSON.stringify({ users: {} }, null, 2), 'utf8')
  }
}

async function readStore(): Promise<{ users: Record<string, any> }> {
  await ensureFile()
  const raw = await readFile(DATA_FILE, 'utf8')
  try {
    return JSON.parse(raw || '{"users":{}}')
  } catch (e) {
    return { users: {} }
  }
}

async function writeStore(store: { users: Record<string, any> }) {
  await ensureFile()
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8')
}

export async function getUserByEmail(email: string) {
  const store = await readStore()
  const users = Object.values(store.users)
  return users.find((u: any) => u.email === email) || null
}

export async function getUserById(id: string) {
  const store = await readStore()
  return store.users[id] || null
}

export async function createUser(data: any) {
  const store = await readStore()
  const id = data.id || uuidv4()
  const user = {
    id,
    email: data.email,
    firstName: data.firstName || 'Unknown',
    lastName: data.lastName || 'User',
    phone: data.phone || '',
    role: data.role || 'CUSTOMER',
    isActive: true,
    createdAt: new Date().toISOString(),
    driverProfile: data.role === 'DRIVER' ? { id: uuidv4(), licenseNumber: '', status: 'OFFLINE', rating: 0, isVerified: false } : null,
  }
  store.users[id] = user
  await writeStore(store)
  return user
}

export async function deleteUserById(id: string) {
  const store = await readStore()
  delete store.users[id]
  await writeStore(store)
}
