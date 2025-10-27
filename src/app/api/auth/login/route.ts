import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { getAuthRecordByEmail } from '@/lib/dynamo'
import { signJwt } from '@/lib/jwt'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // Lookup credentials in DynamoDB
    const usersTable = process.env.DYNAMO_USERS_TABLE
    if (!usersTable) {
      console.error('DYNAMO_USERS_TABLE is not set in environment')
      return NextResponse.json({ error: 'Authentication backend not configured' }, { status: 500 })
    }

    const authRecord = await getAuthRecordByEmail(usersTable, email)
    if (!authRecord) {
      // Log server-side reason for easier debugging while keeping client message generic
      console.debug(`Login failed: no auth record for email=${email}`)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const passwordHash = authRecord.passwordHash
    if (!passwordHash) {
      console.debug(`Login failed: auth record for email=${email} has no passwordHash`)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const match = await bcrypt.compare(password, passwordHash)
    if (!match) {
      console.debug(`Login failed: password mismatch for email=${email}`)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Get user profile from database
    const user = await prisma.user.findUnique({
      where: { id: authRecord.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        driverProfile: {
          select: {
            id: true,
            licenseNumber: true,
            status: true,
            rating: true,
            isVerified: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      )
    }

    // Issue JWT (stateless)
    const token = signJwt({ sub: user.id, email: user.email, role: user.role })

    return NextResponse.json({
      message: 'Login successful',
      user,
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Logout endpoint
export async function DELETE(request: NextRequest) {
  try {
    // Stateless logout for JWT-based auth: client discards token
    return NextResponse.json({ message: 'Logout successful' })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}