import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { DonutChart } from '../components/DonutChart'
import { Skeleton } from '../components/Skeleton'
import { formatCurrency } from '../lib/utils'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, signOut, loading: authLoading } = useAuth()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<any[]>([])
  const [savedAddresses, setSavedAddresses] = useState<
    Array<{ label: string; address: string }>
  >([])

  const spendingData = useMemo(() => {
    const deliverySpend = jobs.reduce(
      (sum, job) => sum + (job.agreedFee || 0),
      0
    )

    if (deliverySpend <= 0) {
      return [
        { name: 'Delivery', value: 120 },
        { name: 'Tips', value: 40 },
      ]
    }

    return [{ name: 'Delivery', value: Number(deliverySpend.toFixed(2)) }]
  }, [jobs])

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      const userDocRef = doc(db, 'users', user!.uid)
      const userSnapshot = await getDoc(userDocRef)
      if (userSnapshot.exists()) {
        setSavedAddresses(userSnapshot.data()?.savedAddresses || [])
      }

      const jobsQuery = query(
        collection(db, 'jobs'),
        where('createdByUid', '==', user!.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      )

      const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
        const jobsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setJobs(jobsData)
        updateActivities(jobsData)
      })

      setLoading(false)

      return () => {
        unsubscribeJobs()
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setLoading(false)
    }
  }

  const updateActivities = (jbs: any[]) => {
    const allActivities: any[] = []

    jbs.forEach((job) => {
      allActivities.push({
        id: job.id,
        type: 'delivery',
        title: `Delivery to ${job.deliveryAddress?.split(',')[0] || 'destination'}`,
        description: job.status,
        status: job.status,
        timestamp: job.createdAt,
        icon: '🚚',
      })
    })

    allActivities.sort((a, b) => {
      const aTime = a.timestamp?.toMillis?.() || 0
      const bTime = b.timestamp?.toMillis?.() || 0
      return bTime - aTime
    })

    setActivities(allActivities.slice(0, 10))
  }

  const handleAddAddress = async () => {
    const label = prompt('Address label (e.g., Home, Office)')
    if (!label) return
    const address = prompt('Full address')
    if (!address) return

    const updated = [...savedAddresses, { label, address }]
    await updateDoc(doc(db, 'users', user!.uid), {
      savedAddresses: updated,
      updatedAt: serverTimestamp(),
    })
    setSavedAddresses(updated)
  }

  const handleRemoveAddress = async (index: number) => {
    const updated = savedAddresses.filter((_, idx) => idx !== index)
    await updateDoc(doc(db, 'users', user!.uid), {
      savedAddresses: updated,
      updatedAt: serverTimestamp(),
    })
    setSavedAddresses(updated)
  }

  const getStats = () => {
    const totalJobs = jobs.length
    const activeJobs = jobs.filter((j) =>
      ['pending', 'active', 'in_progress', 'assigned'].includes(j.status)
    ).length
    const completedJobs = jobs.filter((j) => j.status === 'completed').length
    const totalSpent = jobs.reduce((sum, job) => sum + (job.agreedFee || 0), 0)

    return {
      totalJobs,
      activeJobs,
      completedJobs,
      totalSpent,
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full" variant="purple" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const stats = getStats()

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      {/* Purple Header Card - Starts from top */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] px-6 pt-6 pb-8 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Avatar
                fallback={user?.displayName || user?.email || 'User'}
                size="lg"
              />
              <div>
                <h1 className="text-2xl font-bold">
                  Welcome
                </h1>
                <p className="text-purple-100 text-sm">{user?.email}</p>
              </div>
            </div>
            <div className="relative">
              <button 
                onClick={() => signOut()}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all"
                title="Sign Out"
              >
                ⚙️
              </button>
            </div>
          </div>

          {/* Total Spent - Large Display */}
          <div className="mb-6">
            <p className="text-purple-100 text-sm mb-1">Total Spent</p>
            <p className="text-5xl font-bold">{formatCurrency(stats.totalSpent)}</p>
          </div>

          {/* Quick Stats Grid in Header */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
              <p className="text-sm text-purple-100 mb-1">Total</p>
              <p className="text-2xl font-bold">{stats.totalJobs}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
              <p className="text-sm text-purple-100 mb-1">Active</p>
              <p className="text-2xl font-bold">{stats.activeJobs}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
              <p className="text-sm text-purple-100 mb-1">Done</p>
              <p className="text-2xl font-bold">{stats.completedJobs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 -mt-8 space-y-4">
        {/* Spending Breakdown */}
        <Card variant="elevated" className="animate-fade-in animation-delay-300">
          <CardHeader>
            <CardTitle>Spending Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={spendingData} />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card variant="elevated" className="animate-slide-up animation-delay-400">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/request-delivery"
                className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white rounded-xl p-6 text-center font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <div className="text-3xl mb-2">🚚</div>
                Request Delivery
              </Link>
              <Link
                to="/jobs"
                className="bg-white border-2 border-purple-200 text-purple-600 rounded-xl p-6 text-center font-semibold hover:border-purple-400 hover:scale-105 transition-all duration-300"
              >
                <div className="text-3xl mb-2">📋</div>
                View All Jobs
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Saved Addresses */}
        <Card variant="elevated" className="animate-slide-up animation-delay-300">
          <CardHeader
            action={
              <button
                onClick={handleAddAddress}
                className="text-sm font-semibold text-purple-600"
              >
                + Add
              </button>
            }
          >
            <CardTitle>Saved Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            {savedAddresses.length === 0 ? (
              <p className="text-sm text-gray-500">No saved addresses yet.</p>
            ) : (
              <div className="space-y-3">
                {savedAddresses.map((addr, index) => (
                  <div
                    key={`${addr.label}-${index}`}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{addr.label}</p>
                      <p className="text-sm text-gray-500">{addr.address}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveAddress(index)}
                      className="text-xs text-red-600 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card variant="elevated" className="animate-slide-up animation-delay-400">
          <CardHeader
            action={
              <Link
                to="/jobs"
                className="text-purple-600 text-sm font-medium"
              >
                View All →
              </Link>
            }
          >
            <CardTitle>Recent Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-5xl mb-3">🚚</div>
                <p className="mb-2">No deliveries yet</p>
                <Link
                  to="/request-delivery"
                  className="text-purple-600 text-sm font-medium"
                >
                  Request your first delivery →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.slice(0, 3).map((job: any) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="block"
                  >
                    <div className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            📍 {job.pickupAddress?.split(',')[0] || 'Pickup'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            🎯 {job.deliveryAddress?.split(',')[0] || 'Delivery'}
                          </p>
                        </div>
                        <StatusBadge
                          status={
                            job.status === 'completed'
                              ? 'completed'
                              : job.status === 'in_progress' || job.status === 'active'
                                ? 'in_progress'
                                : 'pending'
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {job.agreedFee ? formatCurrency(job.agreedFee) : '-'}
                        </span>
                        <span className="text-gray-400">
                          {job.createdAt?.toDate?.().toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Timeline */}
        <Card variant="elevated" className="animate-slide-up animation-delay-500">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-xl">
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.timestamp
                          ?.toDate?.()
                          .toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
