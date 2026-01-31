import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { formatCurrency } from '../lib/utils'

interface Stats {
  totalUsers: number
  totalJobs: number
  activeJobs: number
  completedJobs: number
  totalRevenue: number
  todayJobs: number
  totalItems: number
  activeItems: number
  totalOrders: number
  pendingOrders: number
  ordersRevenue: number
  userGrowth: number
  revenueGrowth: number
  usersByRole: { name: string; value: number; color: string }[]
  jobsByStatus: { name: string; value: number }[]
  last7Days: { date: string; jobs: number; revenue: number }[]
  last30Days: { date: string; users: number; revenue: number }[]
  topCategories: { name: string; items: number; sales: number }[]
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalRevenue: 0,
    todayJobs: 0,
    totalItems: 0,
    activeItems: 0,
    totalOrders: 0,
    pendingOrders: 0,
    ordersRevenue: 0,
    userGrowth: 0,
    revenueGrowth: 0,
    usersByRole: [],
    jobsByStatus: [],
    last7Days: [],
    last30Days: [],
    topCategories: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Load users
        const usersSnap = await getDocs(collection(db, 'users'))
        const users = usersSnap.docs.map(doc => doc.data())
        const totalUsers = users.length

        // Count users by role
        const customers = users.filter(u => u.role === 'customer').length
        const couriers = users.filter(u => u.role === 'courier').length
        const runners = users.filter(u => u.packageRunnerProfile?.status === 'approved').length
        const sellers = users.filter(u => u.sellerProfile?.status === 'active').length
        const admins = users.filter(u => u.admin === true).length

        const usersByRole = [
          { name: 'Customers', value: customers, color: '#6B7280' },
          { name: 'Couriers', value: couriers, color: '#6B4EFF' },
          { name: 'Runners', value: runners, color: '#F97316' },
          { name: 'Sellers', value: sellers, color: '#6366F1' },
          { name: 'Admins', value: admins, color: '#EF4444' }
        ]

        // Load jobs
        const jobsSnap = await getDocs(collection(db, 'jobs'))
        const jobs = jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }))
        
        const totalJobs = jobs.length
        const activeJobs = jobs.filter(j => ['pending', 'assigned', 'in_progress'].includes(j.status)).length
        const completedJobs = jobs.filter(j => j.status === 'completed').length
        const totalRevenue = jobs.filter(j => j.status === 'completed').reduce((sum, j) => sum + (j.agreedFee || 0), 0)

        // Jobs by status
        const jobsByStatus = [
          { name: 'Pending', value: jobs.filter(j => j.status === 'pending').length },
          { name: 'Assigned', value: jobs.filter(j => j.status === 'assigned').length },
          { name: 'In Progress', value: jobs.filter(j => j.status === 'in_progress').length },
          { name: 'Completed', value: completedJobs },
          { name: 'Cancelled', value: jobs.filter(j => j.status === 'cancelled').length }
        ]

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayJobs = jobs.filter(j => {
          const createdAt = j.createdAt?.toDate?.()
          return createdAt && createdAt >= today
        }).length

        // Last 7 days data
        const last7Days = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          date.setHours(0, 0, 0, 0)
          const nextDate = new Date(date)
          nextDate.setDate(nextDate.getDate() + 1)

          const dayJobs = jobs.filter(j => {
            const createdAt = j.createdAt?.toDate?.()
            return createdAt && createdAt >= date && createdAt < nextDate
          })

          const dayRevenue = dayJobs
            .filter(j => j.status === 'completed')
            .reduce((sum, j) => sum + (j.agreedFee || 0), 0)

          last7Days.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            jobs: dayJobs.length,
            revenue: dayRevenue
          })
        }

        // Load marketplace items
        const itemsSnap = await getDocs(collection(db, 'marketplaceItems'))
        const items = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }))
        const totalItems = items.length
        const activeItems = items.filter(i => i.status === 'active').length

        // Load marketplace orders
        const ordersSnap = await getDocs(collection(db, 'orders'))
        const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }))
        const totalOrders = orders.length
        const pendingOrders = orders.filter(o => ['pending', 'processing'].includes(o.status)).length
        const ordersRevenue = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0)

        // User growth (last 30 days vs previous 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const sixtyDaysAgo = new Date()
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

        const usersLast30 = users.filter(u => {
          const createdAt = u.createdAt?.toDate?.()
          return createdAt && createdAt >= thirtyDaysAgo
        }).length

        const usersPrevious30 = users.filter(u => {
          const createdAt = u.createdAt?.toDate?.()
          return createdAt && createdAt >= sixtyDaysAgo && createdAt < thirtyDaysAgo
        }).length

        const userGrowth = usersPrevious30 > 0 
          ? ((usersLast30 - usersPrevious30) / usersPrevious30) * 100 
          : 0

        // Revenue growth (last 7 days vs previous 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const fourteenDaysAgo = new Date()
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

        const revenueLast7 = jobs
          .filter(j => {
            const createdAt = j.createdAt?.toDate?.()
            return createdAt && createdAt >= sevenDaysAgo && j.status === 'completed'
          })
          .reduce((sum, j) => sum + (j.agreedFee || 0), 0)

        const revenuePrevious7 = jobs
          .filter(j => {
            const createdAt = j.createdAt?.toDate?.()
            return createdAt && createdAt >= fourteenDaysAgo && createdAt < sevenDaysAgo && j.status === 'completed'
          })
          .reduce((sum, j) => sum + (j.agreedFee || 0), 0)

        const revenueGrowth = revenuePrevious7 > 0 
          ? ((revenueLast7 - revenuePrevious7) / revenuePrevious7) * 100 
          : 0

        // Last 30 days user and revenue data
        const last30Days = []
        for (let i = 29; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          date.setHours(0, 0, 0, 0)
          const nextDate = new Date(date)
          nextDate.setDate(nextDate.getDate() + 1)

          const dayUsers = users.filter(u => {
            const createdAt = u.createdAt?.toDate?.()
            return createdAt && createdAt >= date && createdAt < nextDate
          }).length

          const dayRevenue = jobs
            .filter(j => {
              const createdAt = j.createdAt?.toDate?.()
              return createdAt && createdAt >= date && createdAt < nextDate && j.status === 'completed'
            })
            .reduce((sum, j) => sum + (j.agreedFee || 0), 0) +
          orders
            .filter(o => {
              const createdAt = o.createdAt?.toDate?.()
              return createdAt && createdAt >= date && createdAt < nextDate && o.status === 'completed'
            })
            .reduce((sum, o) => sum + (o.total || 0), 0)

          last30Days.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            users: dayUsers,
            revenue: dayRevenue
          })
        }

        // Top categories by items and sales
        const categoriesSnap = await getDocs(collection(db, 'categories'))
        const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }))
        
        const topCategories = categories.map(cat => {
          const categoryItems = items.filter(i => i.category === cat.id).length
          const categorySales = orders.filter(o => 
            o.items?.some((item: any) => items.find(i => i.id === item.itemId)?.category === cat.id)
          ).length
          return {
            name: cat.name,
            items: categoryItems,
            sales: categorySales
          }
        }).sort((a, b) => b.sales - a.sales).slice(0, 5)

        setStats({ 
          totalUsers, 
          totalJobs, 
          activeJobs, 
          completedJobs, 
          totalRevenue, 
          todayJobs,
          totalItems,
          activeItems,
          totalOrders,
          pendingOrders,
          ordersRevenue,
          userGrowth,
          revenueGrowth,
          usersByRole,
          jobsByStatus,
          last7Days,
          last30Days,
          topCategories
        })
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🔧 Admin Dashboard</h1>
          <p className="text-purple-100">{user?.email}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Card variant="elevated">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-3xl font-bold text-purple-600">{loading ? '...' : stats.totalUsers}</p>
              <p className="text-sm text-gray-600 mt-1">Total Users</p>
              {!loading && stats.userGrowth !== 0 && (
                <p className={`text-xs mt-1 font-semibold ${stats.userGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.userGrowth > 0 ? '↑' : '↓'} {Math.abs(stats.userGrowth).toFixed(1)}% (30d)
                </p>
              )}
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-3xl font-bold text-blue-600">{loading ? '...' : stats.totalJobs}</p>
              <p className="text-sm text-gray-600 mt-1">Delivery Jobs</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">🛍️</div>
              <p className="text-3xl font-bold text-indigo-600">{loading ? '...' : stats.totalItems}</p>
              <p className="text-sm text-gray-600 mt-1">Marketplace Items</p>
              {!loading && (
                <p className="text-xs mt-1 text-green-600 font-semibold">
                  {stats.activeItems} active
                </p>
              )}
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">🛒</div>
              <p className="text-3xl font-bold text-pink-600">{loading ? '...' : stats.totalOrders}</p>
              <p className="text-sm text-gray-600 mt-1">Orders</p>
              {!loading && stats.pendingOrders > 0 && (
                <p className="text-xs mt-1 text-orange-600 font-semibold">
                  {stats.pendingOrders} pending
                </p>
              )}
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">🚀</div>
              <p className="text-3xl font-bold text-orange-600">{loading ? '...' : stats.activeJobs}</p>
              <p className="text-sm text-gray-600 mt-1">Active Jobs</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-3xl font-bold text-green-600">{loading ? '...' : stats.completedJobs}</p>
              <p className="text-sm text-gray-600 mt-1">Completed Jobs</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">💰</div>
              <p className="text-2xl font-bold text-purple-600">{loading ? '...' : formatCurrency(stats.totalRevenue + stats.ordersRevenue)}</p>
              <p className="text-sm text-gray-600 mt-1">Total Revenue</p>
              {!loading && stats.revenueGrowth !== 0 && (
                <p className={`text-xs mt-1 font-semibold ${stats.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.revenueGrowth > 0 ? '↑' : '↓'} {Math.abs(stats.revenueGrowth).toFixed(1)}% (7d)
                </p>
              )}
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-3xl font-bold text-indigo-600">{loading ? '...' : stats.todayJobs}</p>
              <p className="text-sm text-gray-600 mt-1">Today's Jobs</p>
            </CardContent>
          </Card>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>⚡ Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link to="/users" className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl hover:shadow-lg transition-all text-center">
                <div className="text-4xl mb-3">👥</div>
                <h3 className="font-bold text-gray-900 mb-1">Manage Users</h3>
                <p className="text-sm text-gray-600">View and manage all users</p>
              </Link>

              <Link to="/jobs" className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl hover:shadow-lg transition-all text-center">
                <div className="text-4xl mb-3">📦</div>
                <h3 className="font-bold text-gray-900 mb-1">Manage Jobs</h3>
                <p className="text-sm text-gray-600">View and manage all deliveries</p>
              </Link>

              <Link to="/audit-logs" className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl hover:shadow-lg transition-all text-center">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="font-bold text-gray-900 mb-1">Audit Logs</h3>
                <p className="text-sm text-gray-600">View admin action history</p>
              </Link>

              <Link to="/feature-flags" className="p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-xl hover:shadow-lg transition-all text-center">
                <div className="text-4xl mb-3">🎚️</div>
                <h3 className="font-bold text-gray-900 mb-1">Feature Flags</h3>
                <p className="text-sm text-gray-600">Toggle platform features</p>
              </Link>

              <Link to="/disputes" className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl hover:shadow-lg transition-all text-center">
                <div className="text-4xl mb-3">⚖️</div>
                <h3 className="font-bold text-gray-900 mb-1">Disputes</h3>
                <p className="text-sm text-gray-600">Resolve customer disputes</p>
              </Link>

              <Link to="/courier-approval" className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl hover:shadow-lg transition-all text-center">
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="font-bold text-gray-900 mb-1">Courier Approval</h3>
                <p className="text-sm text-gray-600">Review courier applications</p>
              </Link>

              <Link to="/revenue" className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-xl hover:shadow-lg transition-all text-center">
                <div className="text-4xl mb-3">💰</div>
                <h3 className="font-bold text-gray-900 mb-1">Revenue</h3>
                <p className="text-sm text-gray-600">Financial analytics</p>
              </Link>

              <Link to="/settings" className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl hover:shadow-lg transition-all text-center">
                <div className="text-4xl mb-3">⚙️</div>
                <h3 className="font-bold text-gray-900 mb-1">Settings</h3>
                <p className="text-sm text-gray-600">Platform configuration</p>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Charts */}
        {!loading && (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Users by Role Pie Chart */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>👥 Users by Role</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.usersByRole.filter(r => r.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value, percent }: any) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stats.usersByRole.filter(r => r.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Jobs by Status Bar Chart */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>📊 Jobs by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.jobsByStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6B4EFF" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Last 7 Days Trend */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>📈 Last 7 Days Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.last7Days}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="jobs" 
                      stroke="#6B4EFF" 
                      strokeWidth={2}
                      name="Jobs Created"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="Revenue ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Last 30 Days User Growth */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>📊 30-Day User Growth & Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.last30Days}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="users" 
                      stroke="#6366F1" 
                      strokeWidth={2}
                      name="New Users"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="Revenue ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Categories */}
            {stats.topCategories.length > 0 && (
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>🏆 Top Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.topCategories}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="items" fill="#6B4EFF" name="Items Listed" />
                      <Bar dataKey="sales" fill="#10B981" name="Sales" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
