import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminFlowLogsPage from '../AdminFlowLogs'
import { describe, test, vi, beforeEach, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import * as axe from 'axe-core'

// Reuse and extend existing mocks
const simulateRuleMock = vi.fn()
vi.mock('../../lib/cloudFunctions', () => ({
  simulateRule: (...args: any[]) => simulateRuleMock(...args)
}))

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

beforeEach(() => {
  vi.resetAllMocks()
})

describe('AdminFlowLogs — edge cases & a11y', () => {
  test('has no accessibility violations', async () => {
    getDocsMock.mockResolvedValueOnce({ docs: [ { id: 'run1', data: () => ({ adminId: 'admin-123', targetUserId: 't1', startedAt: { toDate: () => new Date() }, status: 'ok' }) } ] })
    getDocsMock.mockResolvedValueOnce({ docs: [] })

    const { container } = render(<MemoryRouter><AdminFlowLogsPage /></MemoryRouter>)

    // run axe on the rendered container
    const results = await axe.run(container)
    if (results.violations && results.violations.length) {
      console.error('Axe violations:', JSON.stringify(results.violations, null, 2))
    }
    expect(results.violations.length).toBe(0)
  })


  test('keyboard navigation and activation works for Test Rules', async () => {
    getDocsMock
      .mockResolvedValueOnce({ docs: [ { id: 'run1', data: () => ({ adminId: 'admin-123', targetUserId: 't1', startedAt: { toDate: () => new Date() }, status: 'ok' }) } ] })
      .mockResolvedValueOnce({ docs: [] })

    simulateRuleMock.mockResolvedValueOnce({ allowed: true, status: 200, body: {} })

    render(<MemoryRouter><AdminFlowLogsPage /></MemoryRouter>)

    // Focus sequence: tab to first 'View' button then open test buttons
    await waitFor(() => screen.getByText('View'))
    const viewBtn = screen.getByText('View')
    viewBtn.focus()
    expect(viewBtn).toHaveFocus()

    // Activate via keyboard
    await userEvent.keyboard('{Enter}')

    // Wait for Test Rules buttons to appear and then tab to them
    await waitFor(() => screen.getByRole('button', { name: /Test Rules \(as admin\)/ }))

    // tab into the Test Rules (simulate user tabbing)
    await userEvent.tab()
    await userEvent.tab()

    const adminBtn = screen.getByRole('button', { name: /Test Rules \(as admin\)/ })
    adminBtn.focus()
    expect(adminBtn).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(simulateRuleMock).toHaveBeenCalled())
  })

  test('shows error when simulateRule rejects', async () => {
    getDocsMock
      .mockResolvedValueOnce({ docs: [ { id: 'run1', data: () => ({ adminId: 'admin-123', targetUserId: 't1', startedAt: { toDate: () => new Date() }, status: 'ok' }) } ] })
      .mockResolvedValueOnce({ docs: [] })

    simulateRuleMock.mockRejectedValueOnce(new Error('Network failure'))

    render(<MemoryRouter><AdminFlowLogsPage /></MemoryRouter>)

    await waitFor(() => screen.getByText('View'))
    userEvent.click(screen.getByText('View'))

    await waitFor(() => screen.getByRole('button', { name: /Test Rules \(as admin\)/ }))
    userEvent.click(screen.getByRole('button', { name: /Test Rules \(as admin\)/ }))

    await waitFor(() => expect(screen.getByText(/Network failure/)).toBeInTheDocument())
  })

  test('copy ID uses clipboard API', async () => {
    getDocsMock
      .mockResolvedValueOnce({ docs: [ { id: 'run1', data: () => ({ adminId: 'admin-123', targetUserId: 't1', startedAt: { toDate: () => new Date() }, status: 'ok' }) } ] })
      .mockResolvedValueOnce({ docs: [] })

    // mock clipboard
    const writeText = vi.fn()
    ;(global as any).navigator.clipboard = { writeText }

    render(<MemoryRouter><AdminFlowLogsPage /></MemoryRouter>)

    await waitFor(() => screen.getByText('View'))
    const copyBtn = screen.getByText('Copy ID')
    userEvent.click(copyBtn)

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('run1'))
  })
})