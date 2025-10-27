import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export { stripe }

// Stripe payment helper functions
export class StripePaymentService {
  static async createPaymentIntent(amount: number, customerId?: string, metadata?: any) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe uses cents
        currency: 'usd',
        customer: customerId,
        metadata: metadata || {},
        automatic_payment_methods: {
          enabled: true,
        },
      })

      return { success: true, data: paymentIntent }
    } catch (error) {
      console.error('Stripe payment intent error:', error)
      return { success: false, error }
    }
  }

  static async confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      })

      return { success: true, data: paymentIntent }
    } catch (error) {
      console.error('Stripe confirm payment error:', error)
      return { success: false, error }
    }
  }

  static async getPaymentIntent(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      return { success: true, data: paymentIntent }
    } catch (error) {
      console.error('Stripe get payment intent error:', error)
      return { success: false, error }
    }
  }

  static async cancelPaymentIntent(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId)
      return { success: true, data: paymentIntent }
    } catch (error) {
      console.error('Stripe cancel payment error:', error)
      return { success: false, error }
    }
  }

  static async createRefund(paymentIntentId: string, amount?: number, reason?: string) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason as any,
      })

      return { success: true, data: refund }
    } catch (error) {
      console.error('Stripe refund error:', error)
      return { success: false, error }
    }
  }

  static async createCustomer(email: string, name?: string, phone?: string) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        phone,
      })

      return { success: true, data: customer }
    } catch (error) {
      console.error('Stripe create customer error:', error)
      return { success: false, error }
    }
  }
}