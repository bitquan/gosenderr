import { createHash, randomBytes } from 'crypto';

export type SenderrplacePaymentMode = 'required' | 'optional' | 'disabled';
export type SenderrplaceJobType = 'package' | 'food';
export type SenderrplaceAvailabilityReason =
  | 'AVAILABLE'
  | 'OUTSIDE_BOOKING_WINDOW'
  | 'NO_ONLINE_COURIER'
  | 'COURIER_LOCATION_UNAVAILABLE'
  | 'OUT_OF_SERVICE_RADIUS'
  | 'WORK_MODE_DISABLED'
  | 'REQUIRED_EQUIPMENT_UNAVAILABLE'
  | 'VEHICLE_REQUIREMENT_UNAVAILABLE'
  | 'COURIER_CAPACITY_REACHED'
  | 'NO_ELIGIBLE_COURIER';

export const SENDERRPLACE_COLLECTIONS = {
  merchants: 'senderrplaceMerchants',
  bookingLinks: 'senderrplaceBookingLinks',
  bookingHolds: 'senderrplaceBookingHolds',
  users: 'users',
  deliveryJobs: 'deliveryJobs',
} as const;

export const SENDERRPLACE_ROLES = {
  admin: 'admin',
  seller: 'seller',
  customer: 'customer',
} as const;

export const SENDERRPLACE_AVAILABILITY_REASON_MESSAGES: Record<
  SenderrplaceAvailabilityReason,
  string
> = {
  AVAILABLE: 'Courier availability confirmed.',
  OUTSIDE_BOOKING_WINDOW: 'Delivery can only be booked within the supported scheduling window.',
  NO_ONLINE_COURIER: 'No couriers are currently online for this request.',
  COURIER_LOCATION_UNAVAILABLE: 'No online courier has an active location signal right now.',
  OUT_OF_SERVICE_RADIUS: 'No online courier currently serves this pickup area.',
  WORK_MODE_DISABLED: 'No online courier currently accepts this delivery type.',
  REQUIRED_EQUIPMENT_UNAVAILABLE: 'No online courier has the required equipment for this delivery.',
  VEHICLE_REQUIREMENT_UNAVAILABLE: 'No online courier matches the required vehicle type right now.',
  COURIER_CAPACITY_REACHED: 'Couriers are currently at capacity. Please try again shortly.',
  NO_ELIGIBLE_COURIER: 'No eligible courier is available right now.',
};

const CONFIRMATION_REGEX = /^[A-Z0-9][A-Z0-9-]{4,63}$/;

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeMerchantName(name: string): string {
  return normalizeWhitespace(name).toLowerCase();
}

export function normalizeConfirmationNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidConfirmationNumber(value: string): boolean {
  return CONFIRMATION_REGEX.test(value);
}

export function maskConfirmationNumber(value: string): string {
  if (value.length <= 4) {
    return '****';
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

export function buildMerchantFingerprint(params: {
  merchantName: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}): string {
  const canonical = [
    normalizeMerchantName(params.merchantName),
    normalizeWhitespace(params.addressLine1).toLowerCase(),
    normalizeWhitespace(params.city).toLowerCase(),
    normalizeWhitespace(params.state).toLowerCase(),
    normalizeWhitespace(params.postalCode).toLowerCase(),
    normalizeWhitespace(params.country).toLowerCase(),
  ].join('|');

  return createHash('sha256').update(canonical).digest('hex').slice(0, 40);
}

export function buildBookingLinkId(idempotencySeed?: string): string {
  if (idempotencySeed) {
    return `idem_${createHash('sha256').update(idempotencySeed).digest('hex').slice(0, 24)}`;
  }

  return `link_${randomBytes(12).toString('hex')}`;
}

export function buildBookingLinkCode(): string {
  return `sp_${randomBytes(5).toString('hex').toUpperCase()}`;
}

export function resolveUserRoles(userData: Record<string, unknown> | undefined): string[] {
  if (!userData) {
    return [];
  }

  const roles = new Set<string>();
  const primaryRole = typeof userData.role === 'string' ? userData.role : null;
  if (primaryRole) {
    roles.add(primaryRole);
  }

  const roleArray = Array.isArray(userData.roles) ? userData.roles : [];
  for (const role of roleArray) {
    if (typeof role === 'string' && role.length > 0) {
      roles.add(role);
    }
  }

  const sellerProfile = userData.sellerProfile as Record<string, unknown> | undefined;
  if (sellerProfile) {
    roles.add(SENDERRPLACE_ROLES.seller);
  }

  return Array.from(roles);
}
