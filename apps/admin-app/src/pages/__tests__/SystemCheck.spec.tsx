import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SystemCheckPage from '../SystemCheck'
import { describe, test, vi, beforeEach, expect } from 'vitest'

// Mock runSystemSimulation
const runSimMock = vi.fn()
vi.mock('../../lib/cloudFunctions', () => ({ runSystemSimulation: (...args: any[]) => runSimMock(...args) }))

// Mock firestore onSnapshot to immediately call callback with a fake entry
import { mockOnSnapshotForDoc } from '../../tests/firestoreMock'

vi.mock('firebase/firestore', async (importOriginal) => {
  const orig = await importOriginal()
  return {
    ...orig,
    onSnapshot: mockOnSnapshotForDoc(null, { created: { users: ['u1'], items: ['i1'], jobs: ['j1'] } })
  }
})

beforeEach(() => {
  vi.resetAllMocks()
})

describe('SystemCheck - Run System Simulation', () => {
  test('calls runSystemSimulation and displays entries in flow map', async () => {
    runSimMock.mockResolvedValueOnce({ runLogId: 'run1', created: { users: ['u1'], items: ['i1'], jobs: ['j1'] } })

    render(<SystemCheckPage />)

    // Select intensity = 3 (Medium)
    const select = screen.getByRole('combobox')
    userEvent.selectOptions(select, '3')

    // Click Run System Simulation
    userEvent.click(screen.getByRole('button', { name: /Run System Simulation/ }))

    await waitFor(() => expect(runSimMock).toHaveBeenCalledWith({ intensity: 3, cleanup: true }))

    // The fake onSnapshot should have injected one entry, which should appear in the result list
    await waitFor(() => expect(screen.getByText(/Created buyer/)).toBeInTheDocument())

    // Summary card should display counts from mocked result
    await waitFor(() => expect(screen.getByText(/Created Users: 1/)).toBeInTheDocument())
  })
})