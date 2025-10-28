import { NextResponse } from 'next/server';
import { putAuthRecord, getAuthRecordByEmail } from '@/lib/dynamo';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName, phone, role = 'CUSTOMER' } = await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const usersTable = process.env.DYNAMO_USERS_TABLE;
    if (!usersTable) {
      return NextResponse.json({ error: 'DynamoDB table not configured' }, { status: 500 });
    }

    const existing = await getAuthRecordByEmail(usersTable, email);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      role,
      createdAt: new Date().toISOString(),
    };
    await putAuthRecord(usersTable, user);

    return NextResponse.json({
      message: 'User registered successfully',
      user: { email, firstName, lastName, role }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

