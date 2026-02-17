import { Timestamp } from 'firebase/firestore';
import type { UserDoc, JobDoc } from '../types/firestore';
import type { Order } from '../types/marketplace';

// Minimal shared test factories to speed test authoring across apps.
// Use `import { makeMockUser, makeMockJob } from '@gosenderr/shared/src/test-utils/mocks'`

export function makeMockUser(overrides: Partial<UserDoc> = {}): UserDoc {
  const now = Timestamp.now();
  return {
    role: (overrides as any).role ?? 'buyer',
    email: overrides.email ?? 'test@example.com',
    phone: overrides.phone ?? undefined,
    displayName: overrides.displayName ?? 'Test User',
    profilePhotoUrl: overrides.profilePhotoUrl ?? undefined,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    averageRating: overrides.averageRating ?? 0,
    totalRatings: overrides.totalRatings ?? 0,
    totalDeliveries: overrides.totalDeliveries ?? 0,
    courierProfile: overrides.courierProfile ?? null,
    packageRunnerProfile: overrides.packageRunnerProfile ?? undefined,
    ...overrides,
  } as UserDoc;
}

export function makeMockJob(overrides: Partial<JobDoc> = {}): JobDoc {
  const now = Timestamp.now();
  const defaultJob: JobDoc = {
    createdByUid: overrides.createdByUid ?? 'buyer_1',
    courierUid: (overrides as any).courierUid ?? null,
    agreedFee: (overrides as any).agreedFee ?? null,
    status: (overrides.status as any) ?? 'open',
    pickup: overrides.pickup ?? { lat: 0, lng: 0, label: 'Pickup' },
    dropoff: overrides.dropoff ?? { lat: 0, lng: 0, label: 'Dropoff' },
    courierSnapshot: overrides.courierSnapshot ?? undefined,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
  return defaultJob;
}

export function makeMockOrder(overrides: Partial<Order> = {}): Order {
  const now = Timestamp.now();
  return {
    id: overrides.id ?? 'order_123',
    orderNumber: overrides.orderNumber ?? 'ORD-000123',
    orderType: overrides.orderType ?? 'marketplace',
    customerId: overrides.customerId ?? 'buyer_1',
    customerName: overrides.customerName ?? 'Buyer One',
    customerEmail: overrides.customerEmail ?? 'buyer@example.com',
    items: overrides.items ?? [],
    subtotal: overrides.subtotal ?? 0,
    tax: overrides.tax ?? 0,
    total: overrides.total ?? 0,
    currency: overrides.currency ?? 'USD',
    paymentIntentId: overrides.paymentIntentId ?? 'pi_123',
    paymentStatus: (overrides as any).paymentStatus ?? 'pending',
    fulfillmentMethod: overrides.fulfillmentMethod ?? 'shipping',
    status: (overrides as any).status ?? 'pending',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...(overrides as any),
  } as Order;
}
