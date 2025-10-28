import { NextRequest, NextResponse } from 'next/server'
import { getAuthRecordByEmail, getUserProfileById } from '@/lib/dynamo'

// GET /api/users?email=foo@example.com
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

    const authTable = process.env.DYNAMO_AUTH_TABLE || process.env.DYNAMO_USERS_TABLE
    const usersTable = process.env.DYNAMO_USERS_TABLE
    if (!authTable || !usersTable) {
      return NextResponse.json({ error: 'DynamoDB tables not configured' }, { status: 500 })
    }

    const auth = await getAuthRecordByEmail(authTable, email)
    if (!auth) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const user = await getUserProfileById(usersTable, auth.userId)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({ user })
  } catch (e) {
    console.error('GET /api/users error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

