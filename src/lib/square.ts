import { Client, Environment } from 'squareup'

const squareEnvironment = process.env.SQUARE_ENVIRONMENT === 'production' 
  ? Environment.Production 
  : Environment.Sandbox

const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment: squareEnvironment,
})

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