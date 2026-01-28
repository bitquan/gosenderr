import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { formatCurrency, formatDate } from '../lib/utils'
import { Link } from 'react-router-dom'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface Transaction {
  id: string
  jobId: string
  amount: number
  type: 'payment' | 'payout' | 'commission'
  status: 'pending' | 'completed' | 'failed'
  userId: string
  userEmail?: string
  createdAt: any
  completedAt?: any
}

interface RevenueStats {
  totalRevenue: number
  totalCommission: number
  totalPayouts: number
  pendingPayouts: number
  thisMonthRevenue: number
  lastMonthRevenue: number
  revenueByDay: { date: string; revenue: number; commission: number }[]
  revenueByJobType: { type: string; revenue: number }[]
  topEarners: { name: string; email: string; earnings: number }[]
}

export default function RevenuePage() {
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    totalCommission: 0,
    totalPayouts: 0,
    pendingPayouts: 0,
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
    revenueByDay: [],
    revenueByJobType: [],
    topEarners: []
  })
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filter, setFilter] = useState<'all' | 'week' | 'month' | 'year'>('month')

  useEffect(() => {
    loadRevenueData()
  }, [])

  const loadRevenueData = async () => {
    try {
      // Load all completed jobs
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('status', '==', 'completed')
      )
      const jobsSnapshot = await getDocs(jobsQuery)
      const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      // Calculate totals
      const totalRevenue = jobs.reduce((sum, job: any) => sum + (job.agreedFee || 0), 0)
      const commissionRate = 0.15 // 15% platform commission
      const totalCommission = totalRevenue * commissionRate
      const totalPayouts = totalRevenue - totalCommission

      // Calculate this month vs last month
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

      const thisMonthRevenue = jobs
        .filter((job: any) => job.completedAt?.toDate?.() >= thisMonthStart)
        .reduce((sum, job: any) => sum + (job.agreedFee || 0), 0)

      const lastMonthRevenue = jobs
        .filter((job: any) => {
          const date = job.completedAt?.toDate?.()
          return date >= lastMonthStart && date <= lastMonthEnd
        })
        .reduce((sum, job: any) => sum + (job.agreedFee || 0), 0)

      // Revenue by day (last 30 days)
      const revenueByDay: { date: string; revenue: number; commission: number }[] = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        
        const dayRevenue = jobs
          .filter((job: any) => {
            const jobDate = job.completedAt?.toDate?.()
            return jobDate?.toDateString() === date.toDateString()
          })
          .reduce((sum, job: any) => sum + (job.agreedFee || 0), 0)

        revenueByDay.push({
          date: dateStr,
          revenue: dayRevenue,
          commission: dayRevenue * commissionRate
        })
      }

      // Revenue by job type (mock data - would need job types in real app)
      const revenueByJobType = [
        { type: 'Standard Delivery', revenue: totalRevenue * 0.6 },
        { type: 'Express Delivery', revenue: totalRevenue * 0.25 },
        { type: 'Package Runner', revenue: totalRevenue * 0.15 }
      ]

      // Top earners (couriers)
      const courierEarnings: { [key: string]: { name: string; email: string; earnings: number } } = {}
      
      jobs.forEach((job: any) => {
        if (job.courierUid) {
          if (!courierEarnings[job.courierUid]) {
            courierEarnings[job.courierUid] = {
              name: job.courierName || 'Unknown',
              email: job.courierEmail || job.courierUid,
              earnings: 0
            }
          }
          courierEarnings[job.courierUid].earnings += (job.agreedFee || 0) * (1 - commissionRate)
        }
      })

      const topEarners = Object.values(courierEarnings)
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 5)

      setStats({
        totalRevenue,
        totalCommission,
        totalPayouts,
        pendingPayouts: 0, // Would need to query pending transactions
        thisMonthRevenue,
        lastMonthRevenue,
        revenueByDay,
        revenueByJobType,
        topEarners
      })
    } catch (error) {
      console.error('Error loading revenue data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Revenue', 'Commission', 'Courier Payout']
    const rows = stats.revenueByDay.map(day => [
      day.date,
      day.revenue,
      day.commission,
      day.revenue - day.commission
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `revenue-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const growthRate = stats.lastMonthRevenue > 0
    ? ((stats.thisMonthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100
    : 0

  const COLORS = ['#6B4EFF', '#9D7FFF', '#C4B0FF', '#E5DBFF']

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <p className="text-gray-600">Loading revenue data...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
          >
            <span className="mr-2">←</span>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">💰 Revenue & Payments</h1>
          <p className="text-purple-100">Platform financial overview</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="elevated">
            <CardContent className="p-6 text-center">
              <div className="text-3xl mb-2">💵</div>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-sm text-gray-600 mt-1">Total Revenue</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6 text-center">
              <div className="text-3xl mb-2">🏦</div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalCommission)}</p>
              <p className="text-sm text-gray-600 mt-1">Platform Fee (15%)</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6 text-center">
              <div className="text-3xl mb-2">💸</div>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalPayouts)}</p>
              <p className="text-sm text-gray-600 mt-1">Courier Payouts</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6 text-center">
              <div className="text-3xl mb-2">📈</div>
              <p className={`text-2xl font-bold ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600 mt-1">vs Last Month</p>
            </CardContent>
          </Card>
        </div>

        {/* This Month vs Last Month */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>📊 Monthly Comparison</CardTitle>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                📥 Export CSV
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200">
                <p className="text-sm text-gray-600 mb-1">This Month</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.thisMonthRevenue)}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Last Month</p>
                <p className="text-3xl font-bold text-gray-600">{formatCurrency(stats.lastMonthRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Over Time Chart */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>📈 Revenue Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#6B4EFF" strokeWidth={2} name="Revenue" />
                  <Line type="monotone" dataKey="commission" stroke="#10B981" strokeWidth={2} name="Commission" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Job Type */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>📦 Revenue by Job Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.revenueByJobType}
                      dataKey="revenue"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry: any) => `${entry.type}: ${formatCurrency(entry.revenue)}`}
                    >
                      {stats.revenueByJobType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Earners */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>🏆 Top Earning Couriers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topEarners.map((earner, index) => (
                  <div key={earner.email} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' :
                        'bg-purple-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{earner.name}</p>
                        <p className="text-xs text-gray-500">{earner.email}</p>
                      </div>
                    </div>
                    <p className="font-bold text-green-600">{formatCurrency(earner.earnings)}</p>
                  </div>
                ))}
                {stats.topEarners.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No earnings data yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">ℹ️</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">About Platform Fees</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Platform charges 15% commission on all completed jobs</li>
                  <li>• Couriers receive 85% of the agreed fee</li>
                  <li>• Payouts are processed automatically upon job completion</li>
                  <li>• Revenue data updates in real-time as jobs are completed</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
