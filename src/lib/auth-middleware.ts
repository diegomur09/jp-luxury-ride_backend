import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
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
  
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  return { user, error }
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