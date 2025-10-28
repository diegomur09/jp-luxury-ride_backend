import { NextRequest, NextResponse } from 'next/server';
import { getAuthRecordByEmail } from '@/lib/dynamo';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const usersTable = process.env.DYNAMO_USERS_TABLE;
    if (!usersTable) {
      return NextResponse.json({ error: 'DynamoDB table not configured' }, { status: 500 });
    }

    const user = await getAuthRecordByEmail(usersTable, email);
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken({ email: user.email, role: user.role });

    return NextResponse.json({
      token,
      user: { email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
