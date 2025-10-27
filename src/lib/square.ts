// Dynamically require the Square SDK at runtime to avoid build-time failures
let squareClient: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Square = require('square')
  const Client: any = Square.Client || Square.Client
  const Environment: any = Square.Environment
  const squareEnvironment = process.env.SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox
  squareClient = new Client({ accessToken: process.env.SQUARE_ACCESS_TOKEN || '', environment: squareEnvironment })
} catch (err) {
  // SDK not available at build-time or not installed in environment used for build. Use a safe stub.
  // Runtime that actually handles Square payments should have the SDK available.
  // Provide a minimal stub to avoid crashes during build/data collection.
  // eslint-disable-next-line no-console
  console.warn('Square SDK not available; using stubbed client for build-time.');
  squareClient = {
    paymentsApi: {},
    customersApi: {},
    ordersApi: {},
    invoicesApi: {},
    refundsApi: {},
  }
}

export const paymentsApi = squareClient.paymentsApi
export const customersApi = squareClient.customersApi
export const ordersApi = squareClient.ordersApi
export const invoicesApi = squareClient.invoicesApi

export { squareClient }

// Square payment helper functions
export class SquarePaymentService {
  static async createPayment(amount: number, sourceId: string, idempotencyKey: string) {
    try {
      const request = {
        sourceId,
        idempotencyKey,
        amountMoney: {
          amount: Math.round(amount * 100), // Square uses cents
          currency: 'USD',
        },
      }

      const response = await paymentsApi.createPayment(request)
      return { success: true, data: response.result }
    } catch (error) {
      console.error('Square payment error:', error)
      return { success: false, error }
    }
  }

  static async getPayment(paymentId: string) {
    try {
      const response = await paymentsApi.getPayment(paymentId)
      return { success: true, data: response.result }
    } catch (error) {
      console.error('Square get payment error:', error)
      return { success: false, error }
    }
  }

  static async cancelPayment(paymentId: string) {
    try {
      const response = await paymentsApi.cancelPayment(paymentId, {})
      return { success: true, data: response.result }
    } catch (error) {
      console.error('Square cancel payment error:', error)
      return { success: false, error }
    }
  }

  static async refundPayment(paymentId: string, amount?: number, idempotencyKey?: string) {
    try {
      const request: any = {
        paymentId,
        idempotencyKey: idempotencyKey || `refund_${Date.now()}`,
      }

      if (amount) {
        request.amountMoney = {
          amount: Math.round(amount * 100),
          currency: 'USD',
        }
      }

      const response = await squareClient.refundsApi.refundPayment(request)
      return { success: true, data: response.result }
    } catch (error) {
      console.error('Square refund error:', error)
      return { success: false, error }
    }
  }
}
