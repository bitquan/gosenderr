import type { UserDoc, JobDoc, Order } from './types/firestore';

// Minimal shared test factories to speed test authoring across apps.
// Use `import { makeMockUser, makeMockJob } from '@gosenderr/shared/src/test-utils/mocks'`

export function makeMockUser(overrides: Partial<UserDoc> = {}): UserDoc {
  const now = new Date();
  return {
    uid: overrides.uid ?? 'user_123',
    displayName: overrides.displayName ?? 'Test User',
    email: overrides.email ?? 'test@example.com',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    courierProfile: overrides.courierProfile ?? null,
    ...overrides,
  } as UserDoc;
}

export function makeMockJob(overrides: Partial<JobDoc> = {}): JobDoc {
  const defaultJob: JobDoc = {
    id: overrides.id ?? 'job_123',
    createdByUid: overrides.createdByUid ?? 'buyer_1',
    courierUid: overrides.courierUid ?? null,
    status: (overrides.status as any) ?? 'open',
    pickup: overrides.pickup ?? {
      address: '123 Pickup St',
      lat: 0,
      lng: 0,
    },
    dropoff: overrides.dropoff ?? {
      address: '456 Dropoff Ave',
      lat: 0,
      lng: 0,
    },
    agreedFee: overrides.agreedFee ?? null,
    pricing: overrides.pricing ?? null,
    createdAt: overrides.createdAt ?? new Date(),
    ...overrides,
  };
  return defaultJob;
}

export function makeMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    orderId: (overrides as any).orderId ?? 'order_123',
    buyerId: (overrides as any).buyerId ?? 'buyer_1',
    courierUid: (overrides as any).courierUid ?? null,
    items: (overrides as any).items ?? [],
    deliveryFee: (overrides as any).deliveryFee ?? 0,
    createdAt: (overrides as any).createdAt ?? new Date(),
    ...(overrides as any),
  } as Order;
}
