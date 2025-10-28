import { NextRequest, NextResponse } from 'next/server'
import { createBooking, scanBookings } from '@/lib/dynamo'
import { authMiddleware } from '@/lib/auth-middleware'
import { z } from 'zod'

const createBookingSchema = z.object({
  vehicleId: z.string().uuid(),
  pickupAddressId: z.string().uuid(),
  dropoffAddressId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  stops: z.array(z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    order: z.number(),
  })).optional(),
  notes: z.string().optional(),
  specialRequests: z.string().optional(),
})

// Create new booking
export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { user } = authResult
    const body = await request.json()
    const validatedData = createBookingSchema.parse(body)

    // For DynamoDB, skip vehicle/address validation for now (can be added with additional tables/logic)
    // Calculate initial pricing (simplified for now)
    const baseFare = 5.00
    const estimatedDistance = 1 // Placeholder, as we can't fetch address/vehicle
    const distanceFare = 0 // Placeholder
    const totalAmount = baseFare

    const bookingsTable = process.env.DYNAMO_BOOKINGS_TABLE || 'bookings'
    const booking = await createBooking(bookingsTable, {
      customerId: user.id,
      vehicleId: validatedData.vehicleId,
      pickupAddressId: validatedData.pickupAddressId,
      dropoffAddressId: validatedData.dropoffAddressId,
      scheduledAt: validatedData.scheduledAt,
      baseFare,
      distanceFare,
      totalAmount,
      distance: estimatedDistance,
      notes: validatedData.notes,
      specialRequests: validatedData.specialRequests,
      status: 'PENDING',
      stops: validatedData.stops || [],
    })

    return NextResponse.json({
      message: 'Booking created successfully',
      booking,
    })
  } catch (error) {
    console.error('Create booking error:', error)
    
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

// Get user's bookings
export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { user } = authResult
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const bookingsTable = process.env.DYNAMO_BOOKINGS_TABLE || 'bookings'
    const { items, lastEvaluatedKey } = await scanBookings(bookingsTable, limit)
    // Filter by user and status in-memory (for demo; for production, use GSI or Query)
    let bookings = items.filter((b: any) => b.customerId === user.id)
    if (status) bookings = bookings.filter((b: any) => b.status === status)
    const total = bookings.length
    bookings = bookings.slice(offset, offset + limit)
    return NextResponse.json({
      bookings,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        lastEvaluatedKey,
      },
    })
  } catch (error) {
    console.error('Get bookings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}