import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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
            email: true,
          },
        },
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
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check ownership or admin access
    const canAccess = await requireOwnership(
      user.id,
      booking.customerId,
      user.role
    ) || (booking.driverId && user.role === 'DRIVER' && booking.driver?.userId === user.id)

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
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { driver: true },
    })

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
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.driverId && { driverId: validatedData.driverId }),
        ...(validatedData.pickupTime && { pickupTime: new Date(validatedData.pickupTime) }),
        ...(validatedData.dropoffTime && { dropoffTime: new Date(validatedData.dropoffTime) }),
        ...(validatedData.notes && { notes: validatedData.notes }),
      },
      include: {
        vehicle: true,
        pickupAddress: true,
        dropoffAddress: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
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
      },
    })

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

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    })

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

    await prisma.booking.delete({
      where: { id: bookingId },
    })

    return NextResponse.json({ message: 'Booking deleted successfully' })
  } catch (error) {
    console.error('Delete booking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}