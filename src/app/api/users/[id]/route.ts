import { NextRequest, NextResponse } from 'next/server'
import { getUserProfileById, putUserProfile } from '@/lib/dynamo'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const usersTable = process.env.DYNAMO_USERS_TABLE
  const id = params.id
  try {
    if (!usersTable) return NextResponse.json({ error: 'DynamoDB table not configured' }, { status: 500 })
    const user = await getUserProfileById(usersTable, id)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ user })
  } catch (e) {
    console.error('GET /api/users/[id] error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const usersTable = process.env.DYNAMO_USERS_TABLE
  const id = params.id
  try {
    const patch = await request.json()
    // Basic allow-list of updatable fields
    const allowed = ['firstName', 'lastName', 'phone', 'role', 'isActive']
    const updates: Record<string, any> = {}
    for (const key of allowed) if (patch[key] !== undefined) updates[key] = patch[key]

    if (!usersTable) return NextResponse.json({ error: 'DynamoDB table not configured' }, { status: 500 })
    const existing = await getUserProfileById(usersTable, id)
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const merged = { ...existing, ...updates, id }
    await putUserProfile(usersTable, merged)
    return NextResponse.json({ user: merged })
  } catch (e) {
    console.error('PATCH /api/users/[id] error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

