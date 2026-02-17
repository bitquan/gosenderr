import { useEffect, useState } from 'react'
import { useAuthUser } from '@/hooks/v2/useAuthUser'
import { loadQueue, clearQueue } from '@/lib/offline/commandQueue'
import { processQueuedCommands } from '@/lib/v2/jobs'

export default function QueuedCommandsPage() {
  const { user } = useAuthUser()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    async function refresh() {
      if (!user?.uid) return setItems([])
      const q = await loadQueue(user.uid)
      if (mounted) setItems(q)
    }
    refresh()
    const id = setInterval(refresh, 5000)
    return () => { mounted = false; clearInterval(id) }
  }, [user?.uid])

  const handleRetryAll = async () => {
    if (!user?.uid) return
    setLoading(true)
    try {
      await processQueuedCommands(user.uid)
      const q = await loadQueue(user.uid)
      setItems(q)
    } catch (e) {
      console.error('Retry all failed', e)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    if (!user?.uid) return
    await clearQueue(user.uid)
    setItems([])
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, marginBottom: 12 }}>Queued Commands</h2>
      <p style={{ color: '#6b7280', marginBottom: 12 }}>Commands persisted locally waiting to be replayed to the server.</p>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <button onClick={handleRetryAll} disabled={loading || !items.length} style={{ padding: '8px 12px', background: '#10b981', color: 'white', borderRadius: 8 }}>Retry All</button>
        <button onClick={handleClear} disabled={!items.length} style={{ padding: '8px 12px', background: '#ef4444', color: 'white', borderRadius: 8 }}>Clear All</button>
      </div>

      {items.length === 0 ? (
        <div style={{ color: '#6b7280' }}>No queued commands</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '8px 6px' }}>Type</th>
              <th style={{ padding: '8px 6px' }}>Payload</th>
              <th style={{ padding: '8px 6px' }}>Attempts</th>
              <th style={{ padding: '8px 6px' }}>Created</th>
              <th style={{ padding: '8px 6px' }}>Last Error</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 6px', verticalAlign: 'top' }}>{it.type}</td>
                <td style={{ padding: '8px 6px', verticalAlign: 'top', fontFamily: 'monospace', fontSize: 12 }}>{JSON.stringify(it.payload)}</td>
                <td style={{ padding: '8px 6px', verticalAlign: 'top' }}>{it.attempts || 0}</td>
                <td style={{ padding: '8px 6px', verticalAlign: 'top' }}>{new Date(it.createdAt).toLocaleString()}</td>
                <td style={{ padding: '8px 6px', verticalAlign: 'top', color: '#b91c1c' }}>{it.lastError || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
