import { NextRequest, NextResponse } from 'next/server'

// Supabase server helpers removed. Provide stubs so imports remain valid.
export async function createClient(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } })
  return { supabase: null, response }
}

export async function getUser(request: NextRequest) {
  return { user: null, error: new Error('Supabase integration removed') }
}