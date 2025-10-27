import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/auth-middleware'
import { PaymentService, PaymentProvider } from '@/lib/payment-service'
import { z } from 'zod'

const createPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  provider: z.enum(['stripe', 'square']),
  paymentMethodId: z.string().optional(), // For Stripe
  sourceId: z.string().optional(), // For Square
  savePaymentMethod: z.boolean().default(false),
})

const confirmPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  paymentMethodId: z.string().optional(),
  sourceId: z.string().optional(),
})

// Create payment intent
export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { user } = authResult
    const body = await request.json()
    const validatedData = createPaymentSchema.parse(body)

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: validatedData.bookingId },
      include: {
        customer: true,
        payment: true,
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check if user owns this booking
    if (booking.customerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if payment already exists
    if (booking.payment) {
      return NextResponse.json(
        { error: 'Payment already exists for this booking' },
        { status: 400 }
      )
    }

    // Calculate total amount including fees
    const baseAmount = booking.totalAmount
    const processingFee = PaymentService.calculateFees(baseAmount, validatedData.provider as PaymentProvider)
    const totalAmount = baseAmount + processingFee

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        userId: user.id,
        provider: validatedData.provider,
        amount: baseAmount,
        processingFee,
        status: 'PENDING',
        currency: 'usd',
      },
    })

    // Create payment with provider
    const paymentResult = await PaymentService.createPayment({
      amount: totalAmount,
      provider: validatedData.provider as PaymentProvider,
      customerId: user.id,
      sourceId: validatedData.sourceId,
      paymentMethodId: validatedData.paymentMethodId,
      metadata: {
        bookingId: booking.id,
        paymentId: payment.id,
      },
    })

    if (!paymentResult.success) {
      // Delete the payment record if provider payment failed
      await prisma.payment.delete({ where: { id: payment.id } })
      
      return NextResponse.json(
        { error: 'Failed to create payment', details: paymentResult.error },
        { status: 400 }
      )
    }

    // Update payment record with provider details
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        [validatedData.provider === 'stripe' ? 'stripePaymentId' : 'squarePaymentId']: 
          paymentResult.data.id,
        status: paymentResult.data.status === 'succeeded' || paymentResult.data.status === 'COMPLETED' 
          ? 'COMPLETED' : 'PROCESSING',
        metadata: paymentResult.data,
      },
    })

    return NextResponse.json({
      message: 'Payment created successfully',
      payment: updatedPayment,
      clientSecret: validatedData.provider === 'stripe' ? paymentResult.data.client_secret : undefined,
    })
  } catch (error) {
    console.error('Create payment error:', error)
    
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

// Get payment history
export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { user } = authResult
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')

    const whereClause: any = {
      userId: user.id,
    }

    if (status) {
      whereClause.status = status
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        booking: {
          include: {
            vehicle: {
              select: {
                make: true,
                model: true,
                type: true,
              },
            },
            pickupAddress: true,
            dropoffAddress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.payment.count({
      where: whereClause,
    })

    return NextResponse.json({
      payments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Get payments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}