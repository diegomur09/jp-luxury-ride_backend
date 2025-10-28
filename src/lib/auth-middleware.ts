import { NextRequest, NextResponse } from 'next/server'
// Removed: Supabase client import no longer needed after DynamoDB migration.
import jwt from 'jsonwebtoken'
// Removed: Prisma import no longer needed after DynamoDB migration.

export async function authMiddleware(request: NextRequest) {
  const { user, error } = await getUser(request)
  
  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized - Please login' },
      { status: 401 }
    )
  }

  // Get user profile from database
  // Removed: Prisma user profile lookup. Use DynamoDB or JWT claims for user info.
  return { user }
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



  // Only JWT bearer token authentication is supported after DynamoDB migration.
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '') || null
  if (!token) return { user: null, error: new Error('No auth token') }
  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET || '') as any
    const user = {
      id: claims.uid || claims.sub || claims.id || null,
      email: claims.email || null,
      role: claims.role || null
    }
    return { user, error: null }
  } catch (err) {
    return { user: null, error: err as Error }
  }
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