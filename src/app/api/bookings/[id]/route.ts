import { NextRequest, NextResponse } from 'next/server'
import { getBookingById, createBooking, deleteBookingById, scanBookings } from '@/lib/dynamo'
import { authMiddleware, requireOwnership } from '@/lib/auth-middleware'
import { z } from 'zod'

const updateBookingSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  driverId: z.string().uuid().optional(),
  pickupTime: z.string().datetime().optional(),
  dropoffTime: z.string().datetime().optional(),
  notes: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { user } = authResult
    const bookingId = params.id

    const bookingsTable = process.env.DYNAMO_BOOKINGS_TABLE || 'bookings'
    const booking = await getBookingById(bookingsTable, bookingId)

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check ownership or admin access
    const canAccess = (user.id === booking.customerId) || user.role === 'ADMIN' || (booking.driverId && user.role === 'DRIVER')

    if (!canAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({ booking })
  } catch (error) {
    console.error('Get booking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { user } = authResult
    const bookingId = params.id
    const body = await request.json()
    const validatedData = updateBookingSchema.parse(body)

    // Get existing booking
    const bookingsTable = process.env.DYNAMO_BOOKINGS_TABLE || 'bookings'
    const existingBooking = await getBookingById(bookingsTable, bookingId)

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check permissions
    let canUpdate = false
    
    if (user.role === 'ADMIN') {
      canUpdate = true
    } else if (user.role === 'CUSTOMER' && existingBooking.customerId === user.id) {
      // Customers can only cancel their own bookings
      canUpdate = validatedData.status === 'CANCELLED'
    } else if (user.role === 'DRIVER') {
      // Drivers can update bookings assigned to them
      canUpdate = existingBooking.driver?.userId === user.id
    }

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Update booking
    // Update booking in DynamoDB (overwrite with merged fields)
    const updatedBooking = { ...existingBooking, ...validatedData }
    await createBooking(bookingsTable, updatedBooking)
    return NextResponse.json({
      message: 'Booking updated successfully',
      booking: updatedBooking,
    })
  } catch (error) {
    console.error('Update booking error:', error)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { user } = authResult
    const bookingId = params.id

    const bookingsTable = process.env.DYNAMO_BOOKINGS_TABLE || 'bookings'
    const booking = await getBookingById(bookingsTable, bookingId)

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Only customers can delete their own bookings, and only if pending
    const canDelete = (user.role === 'ADMIN') || 
      (user.role === 'CUSTOMER' && booking.customerId === user.id && booking.status === 'PENDING')

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Cannot delete this booking' },
        { status: 403 }
      )
    }

    await deleteBookingById(bookingsTable, bookingId)

    return NextResponse.json({ message: 'Booking deleted successfully' })
  } catch (error) {
    console.error('Delete booking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}