/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest'
import PaymentSettingsPage from '../PaymentSettings'

const getDocMock = vi.fn()
const setDocMock = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'admin-uid', email: 'admin@gosenderr.com' },
    loading: false,
  }),
}))

vi.mock('../../lib/firebase', () => ({
  db: {},
}))

vi.mock('firebase/firestore', () => ({
  doc: (...segments: string[]) => ({ path: segments.join('/') }),
  getDoc: (...args: any[]) => getDocMock(...args),
  setDoc: (...args: any[]) => setDocMock(...args),
}))

beforeEach(() => {
  vi.resetAllMocks()
  getDocMock.mockResolvedValue({
    exists: () => true,
    data: () => ({
      platformCommissionRate: 12,
      sellerPayoutSchedule: 'weekly',
      minimumPayoutAmount: 50,
      autoPayouts: true,
      paymentMethods: {
        card: true,
        applePay: true,
        googlePay: true,
      },
      currency: 'USD',
      taxRate: 0,
      collectTax: false,
    }),
  })
  setDocMock.mockResolvedValue(undefined)
  vi.stubGlobal('alert', vi.fn())
})

afterEach(() => {
  cleanup()
})

describe('PaymentSettingsPage', () => {
  test('loads existing settings and persists updated values', async () => {
    render(<PaymentSettingsPage />)

    await waitFor(() => expect(getDocMock).toHaveBeenCalled())

    const commissionInput = (await screen.findAllByRole('spinbutton'))[0]
    await userEvent.click(commissionInput)
    await userEvent.keyboard('{Control>}a{/Control}15')

    const saveButton = screen.getByRole('button', { name: /save payment settings/i })
    await userEvent.click(saveButton)

    await waitFor(() => expect(setDocMock).toHaveBeenCalledTimes(1))
    const savedPayload = setDocMock.mock.calls[0]?.[1]
    expect(savedPayload.platformCommissionRate).toBe(15)
    expect(savedPayload.sellerPayoutSchedule).toBe('weekly')
    expect(savedPayload.currency).toBe('USD')
    expect(globalThis.alert).toHaveBeenCalledWith('Payment settings saved successfully!')
  })
})
