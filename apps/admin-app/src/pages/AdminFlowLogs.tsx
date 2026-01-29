import { useEffect, useState } from 'react'
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'

interface FlowLog {
  id: string
  adminId?: string
  targetUserId?: string
  startedAt?: any
  finishedAt?: any
  status?: string
}

export default function AdminFlowLogsPage() {
  const [logs, setLogs] = useState<FlowLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FlowLog | null>(null)
  const [entries, setEntries] = useState<any[]>([])

  useEffect(() => { loadLogs() }, [])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'adminFlowLogs'), orderBy('startedAt', 'desc'))
      const snap = await getDocs(q)
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as FlowLog)))
    } catch (err) {
      console.error('Failed to load flow logs', err)
    } finally {
      setLoading(false)
    }
  }

  const loadEntries = async (id: string) => {
    try {
      const q = query(collection(db, `adminFlowLogs/${id}/entries`), orderBy('ts', 'asc'))
      const snap = await getDocs(q)
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error('Failed to load entries', err)
      setEntries([])
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🧪 Admin Test Flow Runs</h1>
          <p className="text-purple-100">Run logs for test flows initiated by admins</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Recent Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8">No runs yet</div>
            ) : (
              <div className="space-y-2">
                {logs.map(l => (
                  <div key={l.id} className="p-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">Run {l.id}</div>
                      <div className="text-xs text-gray-600">Target: {l.targetUserId} · Status: {l.status}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setSelected(l); loadEntries(l.id) }} className="px-3 py-1 rounded bg-gray-100">View</button>
                      <button onClick={() => navigator.clipboard.writeText(l.id)} className="px-3 py-1 rounded bg-gray-100">Copy ID</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle>Run Details — {selected.id}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">Admin: {selected.adminId}</div>
                <div className="text-sm text-gray-600">Target User: {selected.targetUserId}</div>
                <div className="text-sm text-gray-600">Status: {selected.status}</div>

                <div className="mt-4 bg-gray-50 p-3 rounded max-h-64 overflow-auto">
                  {entries.length === 0 ? (
                    <p className="text-sm text-gray-500">No entries</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {entries.map(e => (
                        <li key={e.id} className="border-b pb-1">
                          <div className="text-xs text-gray-500">{new Date(e.ts?.toDate?.() || e.ts || Date.now()).toLocaleString()}</div>
                          <div>{e.message}</div>
                          {e.meta && <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{JSON.stringify(e.meta, null, 2)}</pre>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
