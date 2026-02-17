import { describe, it, expect, beforeEach } from 'vitest'
import { enqueueCommand, loadQueue, flushQueue, clearQueue } from './commandQueue'

// ensure localStorage exists in the test environment
if (typeof globalThis.localStorage === 'undefined' || typeof (globalThis.localStorage as any).setItem !== 'function') {
  const store: Record<string, string> = {}
  // simple in-memory localStorage shim for vitest/jsdom
  // (used by commandQueue module)
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
  }
}

const TEST_UID = 'test-user-queue'

beforeEach(async () => {
  await clearQueue(TEST_UID)
})

describe('commandQueue (localStorage-backed)', () => {
  it('enqueue and load', async () => {
    const cmd = await enqueueCommand(TEST_UID, {
      type: 'claimJob',
      payload: { jobId: 'j1', agreedFee: 12.5 },
      idempotencyKey: 'idem-1'
    })
    const items = await loadQueue(TEST_UID)
    expect(items.length).toBe(1)
    expect(items[0].idempotencyKey).toBe('idem-1')
    expect(items[0].type).toBe('claimJob')
  })

  it('flushQueue processes successful items and clears them', async () => {
    await enqueueCommand(TEST_UID, { type: 'claimJob', payload: { jobId: 'j2' }, idempotencyKey: 'i2' })
    await enqueueCommand(TEST_UID, { type: 'updateJobStatus', payload: { jobId: 'j2', nextStatus: 'picked_up' }, idempotencyKey: 'i3' })

    const processed: string[] = []

    const result = await flushQueue(TEST_UID, async (cmd) => {
      processed.push(cmd.type + ':' + cmd.payload.jobId)
      return Promise.resolve({ ok: true })
    })

    expect(result.processed).toBe(2)
    expect(result.remaining).toBe(0)

    const after = await loadQueue(TEST_UID)
    expect(after.length).toBe(0)
    expect(processed).toEqual(['claimJob:j2', 'updateJobStatus:j2'])
  })

  it('flushQueue retains failing items and increments attempts', async () => {
    await enqueueCommand(TEST_UID, { type: 'claimJob', payload: { jobId: 'j3' }, idempotencyKey: 'i4' })

    // first flush: processor fails once
    let called = 0
    let res = await flushQueue(TEST_UID, async (cmd) => {
      called++
      throw new Error('temporary-failure')
    })

    expect(res.processed).toBe(0)
    expect(res.remaining).toBe(1)

    const items = await loadQueue(TEST_UID)
    expect(items[0].attempts).toBe(1)

    // second flush: processor succeeds
    res = await flushQueue(TEST_UID, async (cmd) => ({ ok: true }))
    expect(res.processed).toBe(1)
    expect(res.remaining).toBe(0)
  })
})
