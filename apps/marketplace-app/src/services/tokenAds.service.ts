import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase/client'

type WalletType = 'utility' | 'payout'

interface TokenPolicyResponse {
  enabled: boolean
  costs?: Record<string, number>
}

interface TokenWalletSummaryResponse {
  uid: string
  available: number
  reserved: number
  lifetimePurchased: number
  lifetimeSpent: number
  lifetimeAdjusted: number
}

interface TokenReserveResponse {
  reservationId: string
  walletType: WalletType
  wallet: TokenWalletSummaryResponse
}

interface TokenCommitResponse {
  reservationId: string
  walletType: WalletType
  wallet: TokenWalletSummaryResponse
}

interface TokenReleaseResponse {
  reservationId: string
  walletType: WalletType
  wallet: TokenWalletSummaryResponse
}

const randomSuffix = (length = 8): string => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(length)
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * alphabet.length)
    }
  }
  return Array.from(bytes)
    .map((value) => alphabet[value % alphabet.length])
    .join('')
}

const makeIdempotencyKey = (prefix: string): string => {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `${safePrefix}_${Date.now()}_${randomSuffix(10)}`
}

export async function getTokenPolicyForMarketplace(): Promise<TokenPolicyResponse> {
  const callable = httpsCallable<unknown, TokenPolicyResponse>(functions, 'getTokenPolicy')
  const result = await callable({})
  return result.data
}

export async function getUtilityTokenWalletSummary(): Promise<TokenWalletSummaryResponse> {
  const callable = httpsCallable<{ walletType: WalletType }, TokenWalletSummaryResponse>(
    functions,
    'getTokenWalletSummary',
  )
  const result = await callable({ walletType: 'utility' })
  return result.data
}

export async function reserveUtilityTokens(input: {
  action: string
  amount: number
  metadata?: Record<string, unknown>
}): Promise<TokenReserveResponse> {
  const callable = httpsCallable<
    { action: string; amount: number; idempotencyKey: string; metadata?: Record<string, unknown>; walletType: WalletType },
    TokenReserveResponse
  >(functions, 'tokenReserve')

  const result = await callable({
    action: input.action,
    amount: input.amount,
    idempotencyKey: makeIdempotencyKey(`reserve_${input.action}`),
    metadata: input.metadata,
    walletType: 'utility',
  })

  return result.data
}

export async function commitUtilityTokens(input: {
  reservationId: string
  metadata?: Record<string, unknown>
}): Promise<TokenCommitResponse> {
  const callable = httpsCallable<
    { reservationId: string; idempotencyKey: string; metadata?: Record<string, unknown>; walletType: WalletType },
    TokenCommitResponse
  >(functions, 'tokenCommit')

  const result = await callable({
    reservationId: input.reservationId,
    idempotencyKey: makeIdempotencyKey(`commit_${input.reservationId}`),
    metadata: input.metadata,
    walletType: 'utility',
  })

  return result.data
}

export async function releaseUtilityTokens(input: {
  reservationId: string
  reason: string
  metadata?: Record<string, unknown>
}): Promise<TokenReleaseResponse> {
  const callable = httpsCallable<
    { reservationId: string; idempotencyKey: string; reason: string; metadata?: Record<string, unknown>; walletType: WalletType },
    TokenReleaseResponse
  >(functions, 'tokenRelease')

  const result = await callable({
    reservationId: input.reservationId,
    idempotencyKey: makeIdempotencyKey(`release_${input.reservationId}`),
    reason: input.reason,
    metadata: input.metadata,
    walletType: 'utility',
  })

  return result.data
}

export async function reserveAndCommitUtilityTokens(input: {
  action: string
  amount: number
  metadata?: Record<string, unknown>
}): Promise<{ reservationId: string; wallet: TokenWalletSummaryResponse }> {
  const reservation = await reserveUtilityTokens({
    action: input.action,
    amount: input.amount,
    metadata: input.metadata,
  })

  try {
    const commit = await commitUtilityTokens({
      reservationId: reservation.reservationId,
      metadata: input.metadata,
    })

    return {
      reservationId: reservation.reservationId,
      wallet: commit.wallet,
    }
  } catch (error) {
    try {
      await releaseUtilityTokens({
        reservationId: reservation.reservationId,
        reason: 'commit_failed',
        metadata: input.metadata,
      })
    } catch {
      // no-op: best-effort release
    }
    throw error
  }
}
