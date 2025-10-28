import { NextRequest, NextResponse } from 'next/server'


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_FRONTEND_URL,
    'http://localhost:3001',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ].filter(Boolean) as string[];

  const isApiRoute = pathname.startsWith('/api/');
  const isAllowedOrigin = allowedOrigins.includes(origin);
  const corsHeaders = new Headers();
  if (isApiRoute) {
    corsHeaders.set('Access-Control-Allow-Origin', isAllowedOrigin ? origin : allowedOrigins[0] || '*');
    corsHeaders.set('Vary', 'Origin');
    corsHeaders.set('Access-Control-Allow-Credentials', 'true');
    corsHeaders.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-user-id, x-user-email');

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }
  }

  // Pass through for all other requests, but add CORS headers for API routes
  const response = NextResponse.next();
  if (isApiRoute) {
    corsHeaders.forEach((value, key) => response.headers.set(key, value));
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
