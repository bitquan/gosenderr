export type CommandType = 'claimJob' | 'updateJobStatus'

export interface QueuedCommand {
  id: string
  type: CommandType
  payload: Record<string, any>
  idempotencyKey: string
  createdAt: number
  attempts: number
  lastError?: string | null
}

const STORAGE_PREFIX = 'senderr:cmdqueue:'
const MAX_QUEUE = 200
const MAX_ATTEMPTS = 5
const DB_NAME = 'senderr-cmdqueue'
const DB_STORE = 'queues'

function storageKey(uid: string) {
  return `${STORAGE_PREFIX}${uid}`
}

import { supportsIndexedDB, idbGet, idbSet } from '@/lib/idb'


export async function loadQueue(uid: string): Promise<QueuedCommand[]> {
  try {
    if (supportsIndexedDB()) {
      const items = await idbGet(uid)
      return Array.isArray(items) ? items : []
    }
    const raw = localStorage.getItem(storageKey(uid))
    return raw ? (JSON.parse(raw) as QueuedCommand[]) : []
  } catch (err) {
    console.error('commandQueue.loadQueue error', err)
    return []
  }
}

export async function saveQueue(uid: string, items: QueuedCommand[]) {
  try {
    if (supportsIndexedDB()) {
      await idbSet(uid, items)
      return
    }
    localStorage.setItem(storageKey(uid), JSON.stringify(items.slice(0, MAX_QUEUE)))
  } catch (err) {
    console.error('commandQueue.saveQueue error', err)
  }
}

export async function enqueueCommand(uid: string, cmd: Omit<QueuedCommand, 'id' | 'attempts' | 'createdAt'>) {
  const items = await loadQueue(uid)
  const next: QueuedCommand = {
    id: `q_${Date.now()}_${crypto.randomUUID()}`,
    attempts: 0,
    createdAt: Date.now(),
    lastError: null,
    ...cmd,
  }
  items.push(next)
  await saveQueue(uid, items)
  return next
}

export async function getPendingCount(uid: string) {
  const items = await loadQueue(uid)
  return items.length
}

// processor should throw on fatal error or return normally on success
export async function flushQueue(uid: string, processor: (cmd: QueuedCommand) => Promise<any>) {
  const items = await loadQueue(uid)
  if (!items.length) return { processed: 0, remaining: 0 }

  const remaining: QueuedCommand[] = []
  let processed = 0

  for (const item of items) {
    try {
      await processor(item)
      processed++
    } catch (err: any) {
      const errMsg = (err && err.message) || String(err)
      console.warn('commandQueue: processor error for item', item.id, errMsg)
      const attempts = (item.attempts || 0) + 1
      if (attempts >= MAX_ATTEMPTS) {
        // drop after MAX_ATTEMPTS
        console.warn('commandQueue: dropping item after max attempts', item.id)
      } else {
        remaining.push({ ...item, attempts, lastError: errMsg })
      }
    }
  }

  await saveQueue(uid, remaining)
  return { processed, remaining: remaining.length }
}

export async function clearQueue(uid: string) {
  await saveQueue(uid, [])
}
