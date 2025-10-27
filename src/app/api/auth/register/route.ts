import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { getAuthRecordByEmail, putAuthRecord } from '@/lib/dynamo'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().optional(),
  role: z.preprocess((val) => {
    if (typeof val === 'string') return val.toUpperCase()
    return val
  }, z.enum(['CUSTOMER', 'DRIVER'])).default('CUSTOMER'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Normalize inputs for better UX: uppercase role and ensure required names exist
    const rawRole = body?.role ? String(body.role) : 'CUSTOMER'
    let roleUpper = rawRole.toUpperCase()
    if (roleUpper !== 'CUSTOMER' && roleUpper !== 'DRIVER') {
      roleUpper = 'CUSTOMER'
    }

    const normalized = {
      ...body,
      role: roleUpper,
      firstName: body?.firstName ? String(body.firstName).trim() : 'Unknown',
      lastName: body?.lastName ? String(body.lastName).trim() : 'User',
    }

    const validatedData = registerSchema.parse(normalized)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Create user profile in Postgres (Prisma)
    const newUserId = uuidv4()
    const user = await prisma.user.create({
      data: {
        id: newUserId,
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        role: validatedData.role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    })

    // Store credentials in DynamoDB (best-effort)
    const usersTable = process.env.DYNAMO_USERS_TABLE
    const existing = await getAuthRecordByEmail(usersTable, validatedData.email)
    if (existing) {
      // Rollback Prisma user
      await prisma.user.delete({ where: { id: user.id } })
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 10)
    await putAuthRecord(usersTable, {
      email: validatedData.email,
      userId: user.id,
      passwordHash,
      createdAt: new Date().toISOString(),
    })

    // If registering as driver, create driver profile
    if (validatedData.role === 'DRIVER') {
      await prisma.driver.create({
        data: {
          userId: user.id,
          licenseNumber: '', // To be filled later
          status: 'OFFLINE',
        },
      })
    }

    return NextResponse.json({
      message: 'Registration successful',
      user,
    })
  } catch (error) {
    console.error('Registration error:', error)
    
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