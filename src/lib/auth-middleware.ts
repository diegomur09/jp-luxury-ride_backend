import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function authMiddleware(request: NextRequest) {
  const { user, error } = await getUser(request)
  
  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized - Please login' },
      { status: 401 }
    )
  }

  // Get user profile from database
  const userProfile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
    },
  })

  if (!userProfile || !userProfile.isActive) {
    return NextResponse.json(
      { error: 'User account not found or inactive' },
      { status: 403 }
    )
  }

  return { user: userProfile }
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: ('CUSTOMER' | 'DRIVER' | 'ADMIN')[]
) {
  const authResult = await authMiddleware(request)
  
  if (authResult instanceof NextResponse) {
    return authResult // Return error response
  }

  const { user } = authResult

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    )
  }

  return { user }
}

// Helper to get user from request
async function getUser(request: NextRequest) {
  const { supabase } = await createClient(request)

  // If Supabase was removed, fallback to JWT bearer token authentication.
  if (!supabase) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '') || null
    if (!token) return { user: null, error: new Error('No auth token') }
    try {
      const claims = jwt.verify(token, process.env.JWT_SECRET || '') as any
      const user = { id: claims.uid || claims.sub || claims.id || null, email: claims.email || null }
      return { user, error: null }
    } catch (err) {
      return { user: null, error: err as Error }
    }
  }

  if (supabase) {
    const result = await (supabase as any).auth.getUser()
    const { data: { user }, error } = result
    return { user, error }
  }

  return { user: null, error: new Error('Supabase client unavailable') }
}

// Utility function to check if user owns resource
export async function requireOwnership(
  userId: string,
  resourceUserId: string,
  userRole: string
) {
  // Admins can access any resource
  if (userRole === 'ADMIN') {
    return true
  }

  // Users can only access their own resources
  return userId === resourceUserId
}