import { useEffect, useState } from 'react'
import { runTestFlow } from '../lib/cloudFunctions'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'

interface RunTestFlowModalProps {
  userId: string | undefined
  isOpen: boolean
  onClose: () => void
}

export default function RunTestFlowModal({ userId, isOpen, onClose }: RunTestFlowModalProps) {
  const [steps, setSteps] = useState<string[]>([])
  const [cleanup, setCleanup] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [runLogId, setRunLogId] = useState<string | null>(null)
  const [entries, setEntries] = useState<any[]>([])

  useEffect(() => {
    if (!isOpen) {
      setSteps([])
      setCleanup(true)
      setRunLogId(null)
      setEntries([])
      setError('')
    }
  }, [isOpen])

  const handleRun = async () => {
    if (!userId) return setError('User ID is required')
    setError('')
    setLoading(true)
    try {
      const res = await runTestFlow({ targetUserId: userId, steps, cleanup })
      if (res?.success && res.runLogId) {
        setRunLogId(res.runLogId)
        // fetch entries
        const q = query(collection(db, `adminFlowLogs/${res.runLogId}/entries`), orderBy('ts', 'asc'))
        const snap = await getDocs(q)
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } else {
        setError('Test flow did not return a runLogId')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run test flow')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#6B4EFF] to-[#9D7FFF] bg-clip-text text-transparent">Run Test Flow</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <div className="mb-4 space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Steps (optional)</label>
            <input value={steps.join(',')} onChange={(e) => setSteps(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="onboarding,marketplace,stripe" className="w-full p-3 border rounded-lg" />
            <p className="text-xs text-gray-500 mt-1">Leave empty to run default steps for the user role.</p>
          </div>

          <div className="flex items-center gap-3">
            <input id="cleanup" type="checkbox" checked={cleanup} onChange={(e) => setCleanup(e.target.checked)} />
            <label htmlFor="cleanup" className="text-sm text-gray-700">Cleanup test artifacts after run</label>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button onClick={handleRun} disabled={loading} className="px-4 py-2 bg-gradient-to-r from-[#6B4EFF] to-[#9D7FFF] text-white rounded-lg">{loading ? 'Running...' : 'Run Flow'}</button>
        </div>

        {runLogId && (
          <div className="mt-4">
            <h3 className="font-semibold">Run Log: {runLogId}</h3>
            <div className="mt-2 bg-gray-50 p-3 rounded-lg max-h-64 overflow-auto">
              {entries.length === 0 ? (
                <p className="text-sm text-gray-500">No entries yet (refresh)</p>
              ) : (
                <ul className="space-y-2 text-sm text-gray-800">
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
        )}
      </div>
    </div>
  )
}
