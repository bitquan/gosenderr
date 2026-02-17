import { Timestamp } from 'firebase/firestore'

export type TokenWalletCurrency = 'TOKENS'

export type TokenWalletEntryReason =
  | 'stripe_checkout_topup'
  | 'admin_adjustment'
  | 'job_fee'
  | 'refund'

export interface TokenWalletContract {
  balance: number
  currency: TokenWalletCurrency
  updatedAt?: Timestamp
}

export interface TokenWalletLedgerEntry {
  uid: string
  reason: TokenWalletEntryReason | string
  delta: number
  beforeBalance: number
  afterBalance: number
  currency: TokenWalletCurrency
  createdAt?: Timestamp
  metadata?: Record<string, unknown>
}
