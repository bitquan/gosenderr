import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'
import { clearClientLogs, getClientLogs } from '../lib/clientLogs'

export default function SystemLogsPage() {
  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const electron = (window as any).electron
      if (!electron?.getAppLogs) {
        const clientLogs = getClientLogs()
        setLogs(clientLogs || '')
        return
      }
      const text = await electron.getAppLogs()
      setLogs(text || '')
    } catch (err: any) {
      setError(err?.message || 'Failed to load logs')
      setLogs('')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    const electron = (window as any).electron
    if (!electron?.clearAppLogs) {
      clearClientLogs()
      await loadLogs()
      return
    }
    if (!confirm('Clear local app logs?')) return
    setClearing(true)
    try {
      await electron.clearAppLogs()
      await loadLogs()
    } finally {
      setClearing(false)
    }
  }

  const handleOpenFile = async () => {
    const electron = (window as any).electron
    if (!electron?.openLogFile) return
    await electron.openLogFile()
  }

  useEffect(() => {
    loadLogs()
  }, [])

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#111827] to-[#374151] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">🧾 System Logs</h1>
            <p className="text-gray-200">Local admin-desktop logs for fast debugging</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenFile}
              className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
            >
              Open Log File
            </button>
            <button
              onClick={loadLogs}
              className="px-4 py-2 rounded-lg bg-white text-gray-900 hover:bg-gray-100 transition"
            >
              Refresh
            </button>
            <button
              onClick={handleClear}
              disabled={clearing}
              className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-60"
            >
              {clearing ? 'Clearing…' : 'Clear Logs'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Recent Entries (last 500 lines)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500">Loading logs…</div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : logs.trim().length === 0 ? (
              <div className="text-sm text-gray-500">No logs available.</div>
            ) : (
              <pre className="text-xs leading-5 bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto max-h-[70vh] whitespace-pre-wrap">
                {logs}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
