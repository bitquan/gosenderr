/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import CourierSettingsPage from '../../src/pages/settings/page';

const getDocMock = vi.fn();
const updateDocMock = vi.fn();
const docMock = vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }));
const serverTimestampMock = vi.fn(() => ({ _serverTimestamp: true }));
const getTokenWalletMock = vi.fn();

vi.mock('../../src/hooks/v2/useAuthUser', () => ({
  useAuthUser: () => ({
    user: { uid: 'courier-1', email: 'courier@example.com' },
    loading: false,
  }),
}));

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  storage: {},
  getAuthSafe: () => ({ signOut: vi.fn() }),
}));

vi.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => docMock(...args),
  getDoc: (...args: any[]) => getDocMock(...args),
  updateDoc: (...args: any[]) => updateDocMock(...args),
  serverTimestamp: () => serverTimestampMock(),
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

vi.mock('../../src/lib/tokens', () => ({
  getTokenWallet: (...args: any[]) => getTokenWalletMock(...args),
  createTokenCheckoutSession: vi.fn(),
  makeIdempotencyKey: vi.fn(() => 'test-key'),
}));

describe('Courier settings payout + token wallet', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('alert', vi.fn());
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        courierProfile: {
          isOnline: true,
          serviceRadius: 10,
          payoutMode: 'stripe_connect',
          notificationPrefs: {
            jobOffers: true,
            payoutUpdates: true,
            reminders: true,
          },
        },
      }),
    });
    getTokenWalletMock.mockResolvedValue({
      wallet: {
        available: 22,
        reserved: 2,
        lifetimePurchased: 50,
        lifetimeSpent: 28,
      },
      policy: {
        costs: { jobUnlockStandard: 3 },
        packs: [{ id: 'starter_100', name: 'Starter 100', tokens: 100, priceUsd: 10, active: true }],
      },
    });
  });

  it('shows payout mode options and token wallet details, then reveals external mode controls', async () => {
    render(
      <MemoryRouter>
        <CourierSettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('🧾 Taxes & Payouts')).toBeTruthy();
    });

    expect(screen.getByText('Stripe Connect (recommended)')).toBeTruthy();
    expect(screen.getByText('External provider')).toBeTruthy();
    expect(screen.getByText('Manual settlement')).toBeTruthy();
    expect(screen.getByText('🪙 Senderr Token Wallet')).toBeTruthy();
    expect(screen.getByText('Starter 100')).toBeTruthy();

    const payoutSelect = screen
      .getByText('Payouts')
      .parentElement
      ?.querySelector('select') as HTMLSelectElement;
    expect(payoutSelect).toBeTruthy();

    fireEvent.change(payoutSelect, { target: { value: 'external_provider' } });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Provider (PayPal, Cash App, Zelle...)')).toBeTruthy();
    });
    expect(screen.getByText('External payout mode: job unlock uses tokens.')).toBeTruthy();
    expect(screen.getByText('Job unlock cost: 3 token(s).')).toBeTruthy();
  });
});
