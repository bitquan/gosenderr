export interface PaymentRecord {
  id?: string
  orderId: string
  amountCents: number
  currency: string
  captured: boolean
  stripePaymentIntentId?: string
  createdAt?: number
}

export default PaymentRecord
