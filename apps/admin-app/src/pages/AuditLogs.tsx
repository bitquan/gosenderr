import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  where,
  Timestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'

interface AdminAction {
  id: string
  adminId: string
  adminEmail: string
  action: string
  targetUserId: string
  targetUserEmail?: string
  timestamp: Timestamp
  metadata: Record<string, any>
}

export default function AuditLogs() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [logs, setLogs] = useState<AdminAction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadLogs()
  }, [user, filterAction, dateRange])

  const loadLogs = async () => {
    try {
      setLoading(true)
      let q = query(
        collection(db, 'adminActionLogs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      )

      // Filter by action type
      if (filterAction !== 'all') {
        q = query(
          collection(db, 'adminActionLogs'),
          where('action', '==', filterAction),
          orderBy('timestamp', 'desc'),
          limit(100)
        )
      }

      // Filter by date range
      if (dateRange !== 'all') {
        const now = new Date()
        let startDate = new Date()
        
        switch (dateRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0)
            break
          case 'week':
            startDate.setDate(now.getDate() - 7)
            break
          case 'month':
            startDate.setMonth(now.getMonth() - 1)
            break
        }

        q = query(
          collection(db, 'adminActionLogs'),
          where('timestamp', '>=', Timestamp.fromDate(startDate)),
          orderBy('timestamp', 'desc'),
          limit(100)
        )
      }

      const snapshot = await getDocs(q)
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminAction[]
      
      setLogs(logsData)
    } catch (error) {
      console.error('Error loading audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionBadge = (action: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      'promote_admin': { color: 'bg-red-100 text-red-800', label: '👑 Promote Admin' },
      'demote_admin': { color: 'bg-orange-100 text-orange-800', label: '⬇️ Demote Admin' },
      'approve_runner': { color: 'bg-green-100 text-green-800', label: '✅ Approve Runner' },
      'reject_runner': { color: 'bg-yellow-100 text-yellow-800', label: '❌ Reject Runner' },
      'ban_user': { color: 'bg-red-100 text-red-800', label: '🚫 Ban User' },
      'unban_user': { color: 'bg-blue-100 text-blue-800', label: '✅ Unban User' },
    }

    const badge = badges[action] || { color: 'bg-gray-100 text-gray-800', label: action }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  const formatTimestamp = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#6B4EFF] to-[#9D7FFF] bg-clip-text text-transparent mb-2">
            Audit Logs
          </h1>
          <p className="text-gray-600">View all administrative actions and system events</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Action Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action Type
              </label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Actions</option>
                <option value="promote_admin">Promote Admin</option>
                <option value="demote_admin">Demote Admin</option>
                <option value="approve_runner">Approve Runner</option>
                <option value="reject_runner">Reject Runner</option>
                <option value="ban_user">Ban User</option>
                <option value="unban_user">Unban User</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
            </p>
            <button
              onClick={loadLogs}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Logs List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">No audit logs found</p>
            <p className="text-gray-400 text-sm mt-2">Admin actions will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getActionBadge(log.action)}
                      <span className="text-sm text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-gray-900">
                        <span className="font-semibold">{log.adminEmail}</span>
                        {' '}performed action on{' '}
                        <span className="font-semibold">{log.targetUserEmail || log.targetUserId}</span>
                      </p>
                      
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                            View Details
                          </summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <pre className="text-xs text-gray-600 overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
