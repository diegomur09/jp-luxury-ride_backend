import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    // Verify vehicle exists and is available
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: validatedData.vehicleId, isActive: true },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found or unavailable' },
        { status: 404 }
      )
    }

    // Verify addresses exist
    const [pickupAddress, dropoffAddress] = await Promise.all([
      prisma.address.findUnique({ where: { id: validatedData.pickupAddressId } }),
      prisma.address.findUnique({ where: { id: validatedData.dropoffAddressId } }),
    ])

    if (!pickupAddress || !dropoffAddress) {
      return NextResponse.json(
        { error: 'Invalid pickup or dropoff address' },
        { status: 400 }
      )
    }

    // Calculate initial pricing (simplified for now)
    const baseFare = 5.00
    const estimatedDistance = calculateDistance(
      pickupAddress.latitude || 0,
      pickupAddress.longitude || 0,
      dropoffAddress.latitude || 0,
      dropoffAddress.longitude || 0
    )
    const distanceFare = estimatedDistance * vehicle.pricePerMile
    const totalAmount = baseFare + distanceFare

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        customerId: user.id,
        vehicleId: validatedData.vehicleId,
        pickupAddressId: validatedData.pickupAddressId,
        dropoffAddressId: validatedData.dropoffAddressId,
        scheduledAt: new Date(validatedData.scheduledAt),
        baseFare,
        distanceFare,
        totalAmount,
        distance: estimatedDistance,
        notes: validatedData.notes,
        specialRequests: validatedData.specialRequests,
        status: 'PENDING',
      },
      include: {
        vehicle: true,
        pickupAddress: true,
        dropoffAddress: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    })

    // Create booking stops if provided
    if (validatedData.stops && validatedData.stops.length > 0) {
      await prisma.bookingStop.createMany({
        data: validatedData.stops.map(stop => ({
          bookingId: booking.id,
          ...stop,
        })),
      })
    }

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

    const whereClause: any = {
      customerId: user.id,
    }

    if (status) {
      whereClause.status = status
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        vehicle: true,
        pickupAddress: true,
        dropoffAddress: true,
        driver: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        stops: {
          orderBy: { order: 'asc' },
        },
        payment: true,
        review: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.booking.count({
      where: whereClause,
    })

    return NextResponse.json({
      bookings,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
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