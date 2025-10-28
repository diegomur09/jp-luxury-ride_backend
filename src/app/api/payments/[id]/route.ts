import { NextRequest, NextResponse } from 'next/server'
import { getPaymentById, createPayment } from '@/lib/dynamo'
import { authMiddleware } from '@/lib/auth-middleware'
import { PaymentService } from '@/lib/payment-service'
import { z } from 'zod'

const confirmPaymentSchema = z.object({
  paymentMethodId: z.string().optional(),
  sourceId: z.string().optional(),
})

const refundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { user } = authResult
    const paymentId = params.id

    const paymentsTable = process.env.DYNAMO_PAYMENTS_TABLE || 'payments'
    const payment = await getPaymentById(paymentsTable, paymentId)

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    if (payment.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({ payment })
  } catch (error) {
    console.error('Get payment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Confirm payment (for Stripe payment intents)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { user } = authResult
    const paymentId = params.id
    const body = await request.json()
    const validatedData = confirmPaymentSchema.parse(body)

    const paymentsTable = process.env.DYNAMO_PAYMENTS_TABLE || 'payments'
    const payment = await getPaymentById(paymentsTable, paymentId)

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    if (payment.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Payment cannot be confirmed' },
        { status: 400 }
      )
    }

    // Get the provider-specific payment ID
    const providerPaymentId = payment.provider === 'stripe' 
      ? payment.stripePaymentId 
      : payment.squarePaymentId

    if (!providerPaymentId) {
      return NextResponse.json(
        { error: 'Provider payment ID not found' },
        { status: 400 }
      )
    }

    // Confirm payment with provider
    let paymentResult
    if (payment.provider === 'stripe' && validatedData.paymentMethodId) {
      const { StripePaymentService } = await import('@/lib/stripe')
      paymentResult = await StripePaymentService.confirmPaymentIntent(
        providerPaymentId, 
        validatedData.paymentMethodId
      )
    } else {
      // For Square, payments are typically confirmed immediately
      paymentResult = await PaymentService.getPayment(providerPaymentId, payment.provider as any)
    }

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: 'Failed to confirm payment', details: paymentResult.error },
        { status: 400 }
      )
    }

    // Update payment status
    const updatedPayment = { ...payment, status: paymentResult.data.status === 'succeeded' || paymentResult.data.status === 'COMPLETED' ? 'COMPLETED' : 'PROCESSING', metadata: paymentResult.data }
    await createPayment(paymentsTable, updatedPayment)
    // Skipping booking status update for now
    return NextResponse.json({
      message: 'Payment confirmed successfully',
      payment: updatedPayment,
    })
  } catch (error) {
    console.error('Confirm payment error:', error)
    
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

// Refund payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { user } = authResult
    const paymentId = params.id
    const body = await request.json()
    const validatedData = refundPaymentSchema.parse(body)

    const paymentsTable = process.env.DYNAMO_PAYMENTS_TABLE || 'payments'
    const payment = await getPaymentById(paymentsTable, paymentId)

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Only allow admins or the customer to request refunds
    if (payment.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    if (payment.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Only completed payments can be refunded' },
        { status: 400 }
      )
    }

    const providerPaymentId = payment.provider === 'stripe' 
      ? payment.stripePaymentId 
      : payment.squarePaymentId

    if (!providerPaymentId) {
      return NextResponse.json(
        { error: 'Provider payment ID not found' },
        { status: 400 }
      )
    }

    // Process refund with payment provider
    const refundResult = await PaymentService.refundPayment({
      paymentId: providerPaymentId,
      provider: payment.provider as any,
      amount: validatedData.amount,
      reason: validatedData.reason,
    })

    if (!refundResult.success) {
      return NextResponse.json(
        { error: 'Failed to process refund', details: refundResult.error },
        { status: 400 }
      )
    }

    // Update payment record
    const refundAmount = validatedData.amount || payment.amount
    const updatedPayment = { ...payment, status: refundAmount >= payment.amount ? 'REFUNDED' : 'COMPLETED', refundAmount: (payment.refundAmount || 0) + refundAmount, metadata: { ...payment.metadata, refunds: [ ...(payment.metadata?.refunds || []), refundResult.data ] } }
    await createPayment(paymentsTable, updatedPayment)
    // Skipping booking status update for now
    return NextResponse.json({
      message: 'Refund processed successfully',
      payment: updatedPayment,
      refund: refundResult.data,
    })
  } catch (error) {
    console.error('Refund payment error:', error)
    
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