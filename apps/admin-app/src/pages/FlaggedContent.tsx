import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { formatCurrency } from '../lib/utils'

interface FlaggedItem {
  id: string
  title: string
  description: string
  price: number
  category: string
  images: string[]
  vendorId: string
  vendorName: string
  vendorEmail: string
  status: 'flagged'
  flagReason: string
  flaggedAt: any
  flaggedBy: string
  createdAt?: any
}

export default function FlaggedContentPage() {
  const [items, setItems] = useState<FlaggedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFlaggedItems()
  }, [])

  const loadFlaggedItems = async () => {
    try {
      const q = query(
        collection(db, 'marketplaceItems'),
        where('status', '==', 'flagged'),
        orderBy('flaggedAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FlaggedItem))
      
      setItems(itemsData)
    } catch (error) {
      console.error('Error loading flagged items:', error)
    } finally {
      setLoading(false)
    }
  }

  const getReasonBadge = (reason: string) => {
    const lowerReason = reason.toLowerCase()
    if (lowerReason.includes('inappropriat')) {
      return { color: 'bg-red-100 text-red-800', icon: '🔞' }
    }
    if (lowerReason.includes('misleading') || lowerReason.includes('fraud')) {
      return { color: 'bg-orange-100 text-orange-800', icon: '⚠️' }
    }
    if (lowerReason.includes('copyright') || lowerReason.includes('trademark')) {
      return { color: 'bg-purple-100 text-purple-800', icon: '©️' }
    }
    if (lowerReason.includes('spam')) {
      return { color: 'bg-yellow-100 text-yellow-800', icon: '🚫' }
    }
    return { color: 'bg-gray-100 text-gray-800', icon: '🚩' }
  }

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Unknown'
    const date = timestamp.toDate()
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const stats = {
    total: items.length,
    lastHour: items.filter(i => {
      const flaggedTime = i.flaggedAt?.toMillis()
      return flaggedTime && (Date.now() - flaggedTime) < 3600000
    }).length,
    lastDay: items.filter(i => {
      const flaggedTime = i.flaggedAt?.toMillis()
      return flaggedTime && (Date.now() - flaggedTime) < 86400000
    }).length
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#EF4444] to-[#DC2626] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🚩 Flagged Content</h1>
          <p className="text-red-100">Review and moderate flagged marketplace items</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card variant="elevated">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-1">🚩</div>
              <p className="text-2xl font-bold text-red-600">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Flagged</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-1">⏰</div>
              <p className="text-2xl font-bold text-orange-600">{stats.lastHour}</p>
              <p className="text-sm text-gray-600">Last Hour</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-1">📅</div>
              <p className="text-2xl font-bold text-purple-600">{stats.lastDay}</p>
              <p className="text-sm text-gray-600">Last 24 Hours</p>
            </CardContent>
          </Card>
        </div>

        {/* Flagged Items List */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Flagged Items Queue ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading flagged items...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-gray-500 text-lg font-medium">No flagged items</p>
                <p className="text-gray-400 text-sm mt-2">All items are in good standing!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => {
                  const reasonBadge = getReasonBadge(item.flagReason)
                  
                  return (
                    <Link
                      key={item.id}
                      to={`/marketplace/${item.id}`}
                      className="block"
                    >
                      <div className="p-4 border-2 border-red-200 bg-red-50 rounded-xl hover:shadow-lg transition-all cursor-pointer">
                        <div className="flex gap-4">
                          {/* Item Image */}
                          <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {item.images?.[0] ? (
                              <img 
                                src={item.images[0]} 
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">
                                📦
                              </div>
                            )}
                          </div>

                          {/* Item Details */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                                <p className="text-sm text-gray-600">by {item.vendorName || item.vendorEmail}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-purple-600">{formatCurrency(item.price)}</p>
                                <p className="text-xs text-gray-500">{getTimeAgo(item.flaggedAt)}</p>
                              </div>
                            </div>

                            {/* Flag Reason */}
                            <div className="mb-3 p-3 bg-white border border-red-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${reasonBadge.color} flex items-center gap-1`}>
                                  <span>{reasonBadge.icon}</span>
                                  Flag Reason
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mt-2 font-medium">{item.flagReason}</p>
                            </div>

                            {/* Quick Info */}
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{item.category}</span>
                              <span>•</span>
                              <span>Created {item.createdAt?.toDate?.()?.toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Hint */}
                        <div className="mt-3 pt-3 border-t border-red-200 text-center">
                          <p className="text-sm text-red-600 font-medium">
                            Click to review and take action →
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
