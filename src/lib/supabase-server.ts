import { NextRequest, NextResponse } from 'next/server'

// Supabase server helpers removed. Provide stubs so imports remain valid.
// Removed: Supabase server helpers are no longer used after DynamoDB migration.
  const response = NextResponse.next({ request: { headers: request.headers } })
  return { supabase: null, response }
}

// Removed: Supabase server helpers are no longer used after DynamoDB migration.
  return { user: null, error: new Error('Supabase integration removed') }
}