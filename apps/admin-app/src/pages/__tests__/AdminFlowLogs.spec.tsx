import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminFlowLogsPage from '../AdminFlowLogs'
import { MemoryRouter } from 'react-router-dom'
import { describe, test, vi, beforeEach } from 'vitest'

// Mock simulateRule callable
const simulateRuleMock = vi.fn()
vi.mock('../../lib/cloudFunctions', () => ({
  simulateRule: (...args: any[]) => simulateRuleMock(...args)
}))

// Mock Firestore helpers used in the component
const getDocsMock = vi.fn()
vi.mock('firebase/firestore', () => ({
  getFirestore: (app?: any) => ({}),
  connectFirestoreEmulator: (...args: any[]) => undefined,
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  getDocs: (...args: any[]) => getDocsMock(...args),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(() => ({})),
  Timestamp: { now: () => ({ toDate: () => new Date() }) }
}))

describe('AdminFlowLogs - Test Rules UI', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  test('shows logs and allows testing rules as admin and other', async () => {
    // prepare getDocs to return one run log, then empty entries
    getDocsMock
      .mockResolvedValueOnce({ docs: [ { id: 'run1', data: () => ({ adminId: 'admin-123', targetUserId: 't1', startedAt: { toDate: () => new Date() }, status: 'ok' }) } ] })
      .mockResolvedValueOnce({ docs: [] })

    simulateRuleMock.mockResolvedValueOnce({ allowed: true, status: 200, body: {} })

    const { container } = render(<MemoryRouter><AdminFlowLogsPage /></MemoryRouter>)

    // Wait for the run to appear
    await waitFor(() => expect(screen.getByText(/Run run1/)).toBeInTheDocument())

    // Click View to load entries
    userEvent.click(screen.getByText('View'))

    // Wait for the Test Rules buttons to appear, then click Test Rules (as admin)
    await waitFor(() => screen.getByRole('button', { name: /Test Rules \(as admin\)/ }))
    userEvent.click(screen.getByRole('button', { name: /Test Rules \(as admin\)/ }))

    // Expect simulateRule to be called and result to be displayed
    await waitFor(() => expect(simulateRuleMock).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText(/"allowed": true/)).toBeInTheDocument())

    // Now simulate a denial for "other"
    getDocsMock.mockResolvedValueOnce({ docs: [] })
    simulateRuleMock.mockResolvedValueOnce({ allowed: false, status: 403, body: { error: { message: 'No matching allow statements' } } })

    // Click Test Rules (as other)
    userEvent.click(screen.getByRole('button', { name: /Test Rules \(as other\)/ }))

    await waitFor(() => expect(simulateRuleMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByText(/"allowed": false/)).toBeInTheDocument())
  })
})