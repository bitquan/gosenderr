import { useState, useEffect } from 'react'
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
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { exportToCSV, formatAuditLogsForExport } from '../lib/csvExport'

interface AdminLog {
  id: string
  action: string
  timestamp: any
  adminEmail?: string
  userId?: string
  itemId?: string
  orderId?: string
  settingId?: string
  oldStatus?: string
  newStatus?: string
  amount?: number
  reason?: string
  metadata?: Record<string, any>
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      const q = query(
        collection(db, 'adminLogs'),
        orderBy('timestamp', 'desc'),
        limit(200)
      )

      const snapshot = await getDocs(q)
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminLog[]
      
      setLogs(logsData)
    } catch (error) {
      console.error('Error loading audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    // Filter by action type
    if (filterAction !== 'all' && log.action !== filterAction) {
      return false
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        log.action.toLowerCase().includes(query) ||
        log.adminEmail?.toLowerCase().includes(query) ||
        log.userId?.toLowerCase().includes(query) ||
        log.itemId?.toLowerCase().includes(query) ||
        log.orderId?.toLowerCase().includes(query)
      )
    }

    return true
  })

  const getActionBadge = (action: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      item_status_changed: { color: 'bg-blue-100 text-blue-800', label: 'Item Status' },
      item_featured: { color: 'bg-purple-100 text-purple-800', label: 'Item Featured' },
      item_unfeatured: { color: 'bg-gray-100 text-gray-800', label: 'Item Unfeatured' },
      item_deleted: { color: 'bg-red-100 text-red-800', label: 'Item Deleted' },
      order_status_change: { color: 'bg-yellow-100 text-yellow-800', label: 'Order Status' },
      order_refunded: { color: 'bg-red-100 text-red-800', label: 'Order Refunded' },
      order_notes_updated: { color: 'bg-blue-100 text-blue-800', label: 'Order Notes' },
      setting_updated: { color: 'bg-green-100 text-green-800', label: 'Setting Updated' },
      user_status_changed: { color: 'bg-orange-100 text-orange-800', label: 'User Status' },
      flag_toggled: { color: 'bg-indigo-100 text-indigo-800', label: 'Feature Flag' },
      user_suspended: { color: 'bg-orange-100 text-orange-800', label: 'User Suspended' },
      user_banned: { color: 'bg-red-100 text-red-800', label: 'User Banned' },
      user_role_changed: { color: 'bg-blue-100 text-blue-800', label: 'Role Changed' },
      dispute_resolved: { color: 'bg-green-100 text-green-800', label: 'Dispute Resolved' }
    }
    
    const badge = badges[action] || { color: 'bg-gray-100 text-gray-800', label: action }
    return badge
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
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
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderLogDetails = (log: AdminLog) => {
    const details: string[] = []
    
    if (log.userId) details.push(`User: ${log.userId.slice(0, 12)}...`)
    if (log.itemId) details.push(`Item: ${log.itemId.slice(0, 12)}...`)
    if (log.orderId) details.push(`Order: ${log.orderId.slice(0, 12)}...`)
    if (log.settingId) details.push(`Setting: ${log.settingId}`)
    if (log.oldStatus && log.newStatus) details.push(`${log.oldStatus} → ${log.newStatus}`)
    if (log.amount) details.push(`Amount: $${log.amount.toFixed(2)}`)
    if (log.reason) details.push(`Reason: ${log.reason}`)
    
    return details.length > 0 ? details.join(' • ') : 'No additional details'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600 mt-2">Track all administrative actions and system events</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search by admin, user, item, or order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="all">All Actions</option>
                <option value="item_status_changed">Item Status Changes</option>
                <option value="item_featured">Item Featured</option>
                <option value="item_deleted">Item Deleted</option>
                <option value="order_status_change">Order Status Changes</option>
                <option value="order_refunded">Order Refunds</option>
                <option value="setting_updated">Setting Updates</option>
                <option value="flag_toggled">Feature Flags</option>
              </select>
            </div>
          </div>
          
          <div className="mt-3 text-sm text-gray-500">
            Showing {filteredLogs.length} of {logs.length} log entries
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Activity Log</CardTitle>
            <button
              onClick={() => exportToCSV(formatAuditLogsForExport(filteredLogs), 'audit-logs')}
              disabled={filteredLogs.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              📥 Export CSV
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Logs Found</h3>
              <p className="text-gray-600">
                {searchQuery || filterAction !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No administrative actions have been logged yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map(log => {
                const badge = getActionBadge(log.action)
                
                return (
                  <div
                    key={log.id}
                    className="border-b pb-3 last:border-b-0 hover:bg-gray-50 p-3 rounded transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-sm text-gray-500">
                          by {log.adminEmail || 'Unknown Admin'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-400">{formatTimestamp(log.timestamp)}</span>
                    </div>
                    
                    <p className="text-sm text-gray-600 ml-3">
                      {renderLogDetails(log)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
