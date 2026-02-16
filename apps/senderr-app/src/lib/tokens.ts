import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type TokenActorType = "customer" | "seller" | "courier";

export interface TokenWalletSnapshot {
  uid: string;
  available: number;
  reserved: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
  lifetimeAdjusted: number;
}

export interface TokenPolicySnapshot {
  enabled: boolean;
  finalSale: boolean;
  tokenValueUsd: number;
  packs: Array<{ id: string; name: string; tokens: number; priceUsd: number; active: boolean }>;
  costs: Record<string, number>;
  gating: Record<string, boolean>;
}

export function makeIdempotencyKey(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  const stamp = Date.now().toString(36);
  return `${prefix}_${stamp}_${random}`.slice(0, 96).replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function getTokenWallet() {
  const callable = httpsCallable(functions, "tokenGetWallet");
  const response = await callable();
  return response.data as { wallet: TokenWalletSnapshot; policy: TokenPolicySnapshot };
}

export async function createTokenCheckoutSession(input: {
  packId: string;
  idempotencyKey: string;
  actorType: TokenActorType;
  successUrl?: string;
  cancelUrl?: string;
}) {
  const callable = httpsCallable(functions, "tokenCreateCheckoutSession");
  const response = await callable(input);
  return response.data as {
    sessionId: string;
    checkoutUrl: string;
    idempotent: boolean;
    pack: { id: string; name: string; tokens: number; priceUsd: number };
  };
}

export async function reserveTokenAction(input: {
  actorType: TokenActorType;
  action: "job_unlock" | "listing_publish" | "cash_fee" | "ad_boost";
  referenceId: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}) {
  const callable = httpsCallable(functions, "tokenReserveAction");
  const response = await callable(input);
  return response.data as {
    status: "reserved" | "not_required";
    reservationId: string | null;
    requiredTokens: number;
    payoutMode: "stripe_connect" | "external_provider" | "manual_settlement";
    wallet: TokenWalletSnapshot;
  };
}

export async function commitTokenAction(input: { reservationId: string; idempotencyKey: string }) {
  const callable = httpsCallable(functions, "tokenCommitAction");
  const response = await callable(input);
  return response.data as { status: "committed"; wallet: TokenWalletSnapshot };
}

export async function releaseTokenAction(input: { reservationId: string; idempotencyKey: string }) {
  const callable = httpsCallable(functions, "tokenReleaseAction");
  const response = await callable(input);
  return response.data as { status: "released"; wallet: TokenWalletSnapshot };
}
