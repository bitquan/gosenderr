import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'

interface CommandFailurePayload {
  command: 'accept' | 'status'
  jobId: string
  message: string
  code?: string
  isOffline: boolean
}

export async function logCommandFailure(payload: CommandFailurePayload): Promise<void> {
  try {
    const callable = httpsCallable<CommandFailurePayload, { ok: boolean }>(
      functions,
      'logCommandFailure',
    )
    await callable(payload)
  } catch (error) {
    console.warn('Failed to report command failure telemetry', error)
  }
}
