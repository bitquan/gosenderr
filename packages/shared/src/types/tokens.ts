export type TokenTransactionType =
  | "purchase"
  | "reserve"
  | "commit"
  | "release"
  | "refund"
  | "admin_adjustment";

export type TokenActorType = "customer" | "seller" | "courier";

export type TokenAction =
  | "job_unlock"
  | "listing_publish"
  | "cash_fee"
  | "ad_boost";

export type TokenPayoutMode =
  | "stripe_connect"
  | "external_provider"
  | "manual_settlement";

export interface TokenPack {
  id: string;
  name: string;
  tokens: number;
  priceUsd: number;
  active: boolean;
}

export interface TokenPolicyCosts {
  jobUnlockStandard: number;
  jobUnlockPriority: number;
  jobUnlockHeavy: number;
  listingPublish: number;
  cashFee: number;
  adBoost24h: number;
  adBoost7d: number;
  adBoost30d: number;
  adFeatured7d: number;
}

export interface TokenPolicy {
  enabled: boolean;
  finalSale: boolean;
  tokenValueUsd: number;
  packs: TokenPack[];
  costs: TokenPolicyCosts;
  gating: {
    courierUnlockRequiresTokensWhenExternalPayout: boolean;
    sellerListingRequiresTokensWhenExternalPayout: boolean;
    customerCashFeeRequiresTokens: boolean;
    adsRequireTokens: boolean;
  };
  updatedAt?: unknown;
  updatedBy?: string | null;
}

export interface TokenWallet {
  uid: string;
  available: number;
  reserved: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
  lifetimeAdjusted: number;
  updatedAt?: unknown;
}

export interface TokenReservation {
  id: string;
  actorUid: string;
  actorType: TokenActorType;
  action: TokenAction;
  tokens: number;
  referenceId: string;
  idempotencyKey: string;
  status: "reserved" | "committed" | "released";
  createdAt?: unknown;
  committedAt?: unknown;
  releasedAt?: unknown;
}

export interface TokenTransaction {
  id: string;
  actorUid: string;
  actorType: TokenActorType;
  type: TokenTransactionType;
  action: TokenAction;
  tokens: number;
  referenceId?: string;
  reservationId?: string;
  idempotencyKey: string;
  notes?: string;
  createdAt?: unknown;
}
