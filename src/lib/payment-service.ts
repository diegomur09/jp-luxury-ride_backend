import { StripePaymentService } from './stripe'
import { SquarePaymentService } from './square'

export type PaymentProvider = 'stripe' | 'square'

export interface PaymentResult {
  success: boolean
  data?: any
  error?: any
}

export interface CreatePaymentOptions {
  amount: number
  provider: PaymentProvider
  customerId?: string
  sourceId?: string // For Square
  paymentMethodId?: string // For Stripe
  metadata?: any
  idempotencyKey?: string
}

export interface RefundOptions {
  paymentId: string
  provider: PaymentProvider
  amount?: number
  reason?: string
  idempotencyKey?: string
}

// Unified payment service that works with both Stripe and Square
export class PaymentService {
  static async createPayment(options: CreatePaymentOptions): Promise<PaymentResult> {
    const { provider, amount, customerId, sourceId, paymentMethodId, metadata, idempotencyKey } = options

    try {
      switch (provider) {
        case 'stripe':
          if (paymentMethodId) {
            // Direct payment with payment method
            const intentResult = await StripePaymentService.createPaymentIntent(amount, customerId, metadata)
            if (!intentResult.success) return intentResult

            return await StripePaymentService.confirmPaymentIntent(intentResult.data.id, paymentMethodId)
          } else {
            // Create payment intent for later confirmation
            return await StripePaymentService.createPaymentIntent(amount, customerId, metadata)
          }

        case 'square':
          if (!sourceId) {
            return { success: false, error: 'Source ID required for Square payments' }
          }
          const key = idempotencyKey || `payment_${Date.now()}_${Math.random()}`
          return await SquarePaymentService.createPayment(amount, sourceId, key)

        default:
          return { success: false, error: 'Invalid payment provider' }
      }
    } catch (error) {
      console.error('Payment creation error:', error)
      return { success: false, error }
    }
  }

  static async getPayment(paymentId: string, provider: PaymentProvider): Promise<PaymentResult> {
    try {
      switch (provider) {
        case 'stripe':
          return await StripePaymentService.getPaymentIntent(paymentId)
        case 'square':
          return await SquarePaymentService.getPayment(paymentId)
        default:
          return { success: false, error: 'Invalid payment provider' }
      }
    } catch (error) {
      console.error('Get payment error:', error)
      return { success: false, error }
    }
  }

  static async refundPayment(options: RefundOptions): Promise<PaymentResult> {
    const { paymentId, provider, amount, reason, idempotencyKey } = options

    try {
      switch (provider) {
        case 'stripe':
          return await StripePaymentService.createRefund(paymentId, amount, reason)
        case 'square':
          return await SquarePaymentService.refundPayment(paymentId, amount, idempotencyKey)
        default:
          return { success: false, error: 'Invalid payment provider' }
      }
    } catch (error) {
      console.error('Refund error:', error)
      return { success: false, error }
    }
  }

  static async cancelPayment(paymentId: string, provider: PaymentProvider): Promise<PaymentResult> {
    try {
      switch (provider) {
        case 'stripe':
          return await StripePaymentService.cancelPaymentIntent(paymentId)
        case 'square':
          return await SquarePaymentService.cancelPayment(paymentId)
        default:
          return { success: false, error: 'Invalid payment provider' }
      }
    } catch (error) {
      console.error('Cancel payment error:', error)
      return { success: false, error }
    }
  }

  // Helper method to determine best payment provider based on context
  static getBestProvider(context: {
    amount: number
    paymentType: 'online' | 'in_person'
    customerLocation?: string
  }): PaymentProvider {
    // For in-person payments, prefer Square
    if (context.paymentType === 'in_person') {
      return 'square'
    }

    // For online payments, prefer Stripe
    return 'stripe'
  }

  // Calculate processing fees for different providers
  static calculateFees(amount: number, provider: PaymentProvider): number {
    switch (provider) {
      case 'stripe':
        return (amount * 0.029) + 0.30 // 2.9% + 30¢
      case 'square':
        return (amount * 0.026) + 0.10 // 2.6% + 10¢ (online)
      default:
        return 0
    }
  }
}