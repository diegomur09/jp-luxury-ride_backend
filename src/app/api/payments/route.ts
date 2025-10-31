import { NextRequest, NextResponse } from 'next/server'
import { createPayment, scanPayments, getBookingById } from '@/lib/dynamo'
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

    // Get booking details from DynamoDB
    const bookingsTable = process.env.DYNAMO_BOOKINGS_TABLE || 'bookings'
    const booking = await getBookingById(bookingsTable, validatedData.bookingId)
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }
    if (booking.customerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    // For demo, skip payment existence check (would require scan or GSI)

    // Calculate total amount including fees
    const baseAmount = booking.totalAmount
    const processingFee = PaymentService.calculateFees(baseAmount, validatedData.provider as PaymentProvider)
    const totalAmount = baseAmount + processingFee

    // Create payment with provider first
    const paymentResult = await PaymentService.createPayment({
      amount: totalAmount,
      provider: validatedData.provider as PaymentProvider,
      customerId: user.id,
      sourceId: validatedData.sourceId,
      paymentMethodId: validatedData.paymentMethodId,
      metadata: {
        bookingId: booking.id,
        // paymentId will be set after record creation
      },
    })

    // Extract provider payment ID
    let providerPaymentId: string | undefined
    if (validatedData.provider === 'stripe') {
      providerPaymentId = paymentResult.data?.id
    } else if (validatedData.provider === 'square') {
      providerPaymentId = paymentResult.data?.payment?.id
    }

    // Create payment record in DynamoDB, persisting provider payment ID
    const paymentsTable = process.env.DYNAMO_PAYMENTS_TABLE || 'payments'
    const payment = await createPayment(paymentsTable, {
      bookingId: booking.id,
      userId: user.id,
      provider: validatedData.provider,
      amount: baseAmount,
      processingFee,
      status: 'PENDING',
      currency: 'usd',
      ...(validatedData.provider === 'stripe' ? { stripePaymentId: providerPaymentId } : {}),
      ...(validatedData.provider === 'square' ? { squarePaymentId: providerPaymentId } : {}),
    })

    return NextResponse.json({
      message: 'Payment created successfully',
      payment,
      clientSecret: validatedData.provider === 'stripe' ? paymentResult.data?.client_secret : undefined,
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

    const paymentsTable = process.env.DYNAMO_PAYMENTS_TABLE || 'payments'
    const { items, lastEvaluatedKey } = await scanPayments(paymentsTable, limit)
    // Filter by user and status in-memory (for demo; for production, use GSI or Query)
    let payments = items.filter((p: any) => p.userId === user.id)
    if (status) payments = payments.filter((p: any) => p.status === status)
    const total = payments.length
    payments = payments.slice(offset, offset + limit)
    return NextResponse.json({
      payments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        lastEvaluatedKey,
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