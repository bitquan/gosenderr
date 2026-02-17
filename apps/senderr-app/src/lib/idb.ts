const DB_NAME = 'senderr-cmdqueue'
const DB_STORE = 'queues'

export function supportsIndexedDB() {
  return typeof indexedDB !== 'undefined'
}

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!supportsIndexedDB()) return reject(new Error('IndexedDB not available'))
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function idbGet(key: string): Promise<any> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly')
      const store = tx.objectStore(DB_STORE)
      const r = store.get(key)
      r.onsuccess = () => resolve(r.result || [])
      r.onerror = () => reject(r.error)
    })
  } catch (err) {
    console.warn('idb.idbGet fallback', err)
    return []
  }
}

export async function idbSet(key: string, value: any) {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite')
      const store = tx.objectStore(DB_STORE)
      const r = store.put(value, key)
      r.onsuccess = () => resolve(true)
      r.onerror = () => reject(r.error)
    })
  } catch (err) {
    console.warn('idb.idbSet fallback', err)
  }
}
