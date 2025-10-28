import { NextRequest, NextResponse } from 'next/server'
import { scanUsers } from '@/lib/dynamo'
import { verifyJwt } from '@/lib/jwt'

function requireAdmin(request: NextRequest) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const payload = verifyJwt(token) as any
  if (!payload || payload.role !== 'ADMIN') {
    return { ok: false, res: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) }
  }
  return { ok: true }
}

export async function GET(request: NextRequest) {
  const adminCheck = requireAdmin(request)
  if (!adminCheck.ok) return adminCheck.res

  const usersTable = process.env.DYNAMO_USERS_TABLE
  if (!usersTable) return NextResponse.json({ error: 'DYNAMO_USERS_TABLE not configured' }, { status: 500 })

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100)
    const startKeyParam = searchParams.get('startKey')
    const exclusiveStartKey = startKeyParam ? JSON.parse(Buffer.from(startKeyParam, 'base64').toString('utf8')) : undefined
    const { items, lastEvaluatedKey } = await scanUsers(usersTable, limit, exclusiveStartKey)
    const nextStartKey = lastEvaluatedKey ? Buffer.from(JSON.stringify(lastEvaluatedKey), 'utf8').toString('base64') : null
    return NextResponse.json({ items, nextStartKey })
  } catch (e) {
    console.error('GET /api/admin/users error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

