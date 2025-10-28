import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Basic CORS setup for API routes
  const origin = request.headers.get('origin') || ''
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean) as string[]

  const isApiRoute = pathname.startsWith('/api/')
  const isAllowedOrigin = allowedOrigins.includes(origin)
  const corsHeaders = new Headers()
  if (isApiRoute) {
    corsHeaders.set('Access-Control-Allow-Origin', isAllowedOrigin ? origin : (allowedOrigins[0] || '*'))
    corsHeaders.set('Vary', 'Origin')
    corsHeaders.set('Access-Control-Allow-Credentials', 'true')
    corsHeaders.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-user-id, x-user-email')
  }

    return new NextResponse(null, { status: 204, headers: corsHeaders })

      return nextResponse
    if (!supabase) {
        // lazy import to avoid adding dependency when unused
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    // Only JWT auth is supported after DynamoDB migration.
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '') || null
    if (!token) return NextResponse.json({ error: 'No auth token' }, { status: 401 })
    try {
      const jwt = await import('jsonwebtoken')
      const claims = jwt.verify(token, process.env.JWT_SECRET || '') as any
      request.user = claims
      return NextResponse.next()
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
        corsHeaders.forEach((value, key) => nextResponse.headers.set(key, value))
        return nextResponse
      } catch (e) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
    }

    const {
      data: { user },
      error,
    } = await (supabase as any).auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Add user info to headers for API routes to use
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', user.id)
    requestHeaders.set('x-user-email', user.email || '')

    const nextResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    // Apply CORS headers to API responses
    corsHeaders.forEach((value, key) => nextResponse.headers.set(key, value))
    return nextResponse
  }

  const passthrough = NextResponse.next()
  return passthrough
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
