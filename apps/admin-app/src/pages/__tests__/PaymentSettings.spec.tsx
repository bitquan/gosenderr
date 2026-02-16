/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import PaymentSettingsPage from '../PaymentSettings';

const getDocMock = vi.fn();
const setDocMock = vi.fn();
const docMock = vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'admin-user-1' } }),
}));

vi.mock('../../lib/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => docMock(...args),
  getDoc: (...args: any[]) => getDocMock(...args),
  setDoc: (...args: any[]) => setDocMock(...args),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('alert', vi.fn());
});

afterEach(() => {
  cleanup();
});

describe('PaymentSettingsPage', () => {
  test('loads settings and saves payment + token policy docs', async () => {
    getDocMock
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          platformCommissionRate: 12,
          sellerPayoutSchedule: 'weekly',
          minimumPayoutAmount: 75,
          autoPayouts: true,
          paymentMethods: { card: true, applePay: true, googlePay: false },
          currency: 'USD',
          taxRate: 8.25,
          collectTax: true,
        }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          enabled: true,
          finalSale: true,
          tokenValueUsd: 0.1,
          costs: {
            jobUnlockStandard: 1,
            jobUnlockPriority: 2,
            jobUnlockHeavy: 3,
            listingPublish: 2,
            cashFee: 1,
            adBoost24h: 5,
            adBoost7d: 25,
            adBoost30d: 80,
            adFeatured7d: 120,
          },
          packs: [{ id: 'starter_100', name: 'Starter 100', tokens: 100, priceUsd: 10, active: true }],
        }),
      });
    setDocMock.mockResolvedValue(undefined);

    render(<PaymentSettingsPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading payment settings/i)).not.toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /Save Payment Settings/i }));

    await waitFor(() => {
      expect(setDocMock).toHaveBeenCalledTimes(2);
    });

    const savedPaths = setDocMock.mock.calls.map((call) => call[0]?.path);
    expect(savedPaths).toContain('platformSettings/payment');
    expect(savedPaths).toContain('platformSettings/tokenPolicy');
  });
});
