import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import EditRoleModal from '../components/EditRoleModal'
import BanUserModal from '../components/BanUserModal'
import { exportToCSV, formatUsersForExport } from '../lib/csvExport'

interface User {
  id: string
  email: string
  role?: string
  admin?: boolean
  banned?: boolean
  courierProfile?: {
    online?: boolean
    vehicleType?: string
  }
  createdAt?: any
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'customer' | 'courier' | 'package_runner' | 'vendor' | 'admin'>('all')
  const [editRoleUser, setEditRoleUser] = useState<User | null>(null)
  const [banUser, setBanUser] = useState<User | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'))
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[]
      console.log('🔍 LOADED USERS:', usersData.length)
      console.log('🔍 USER ROLES:', usersData.map(u => ({ email: u.email, role: u.role, hasCourierProfile: !!u.courierProfile })))
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true
    if (filter === 'admin') return user.role === 'admin'
    if (filter === 'courier') return user.role === 'courier' || user.courierProfile
    if (filter === 'package_runner') return user.role === 'package_runner'
    if (filter === 'vendor') return user.role === 'vendor'
    if (filter === 'customer') return user.role === 'customer' || (!user.role && !user.courierProfile)
    return true
  })

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">👥 User Management</h1>
          <p className="text-purple-100">{users.length} total users {loading && '(loading...)'}</p>
          {users.length === 0 && !loading && (
            <p className="text-yellow-200 text-sm mt-2">⚠️ No users found in database</p>
          )}
          <button
            onClick={() => loadUsers()}
            className="mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-semibold transition"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 flex-wrap">
          {(() => {
            const filterArray = ['all', 'customer', 'courier', 'package_runner', 'vendor', 'admin'] as const
            console.log('🔍 FILTER ARRAY:', filterArray)
            console.log('🔍 FILTER ARRAY LENGTH:', filterArray.length)
            
            return filterArray.map((f) => {
              const count = users.filter(user => {
                if (f === 'all') return true
                if (f === 'admin') return user.role === 'admin'
                if (f === 'courier') return user.role === 'courier' || user.courierProfile
                if (f === 'package_runner') return user.role === 'package_runner'
                if (f === 'vendor') return user.role === 'vendor'
                if (f === 'customer') return user.role === 'customer' || (!user.role && !user.courierProfile)
                return false
              }).length

              console.log(`🔍 FILTER "${f}": ${count} users`)

              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                    filter === f
                      ? 'bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>
                      {f === 'package_runner' ? 'Runners' : f === 'customer' ? 'Customers' : f === 'courier' ? 'Couriers' : f === 'vendor' ? 'Vendors' : f === 'admin' ? 'Admins' : 'All'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      filter === f ? 'bg-white/20' : 'bg-gray-100'
                    }`}>
                      {count}
                    </span>
                  </div>
                </button>
              )
            })
          })()}
        </div>

        {/* Users List */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {filter === 'all' ? 'All Users' : 
                 filter === 'customer' ? 'Customers' :
                 filter === 'courier' ? 'Couriers' :
                 filter === 'package_runner' ? 'Runners' :
                 filter === 'vendor' ? 'Vendors' :
                 filter === 'admin' ? 'Admins' : 'Users'} ({filteredUsers.length})
              </CardTitle>
              <button
                onClick={() => exportToCSV(formatUsersForExport(filteredUsers), 'users')}
                disabled={filteredUsers.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                📥 Export CSV
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">No users found</p>
                {filter !== 'all' && (
                  <button
                    onClick={() => setFilter('all')}
                    className="mt-4 text-purple-600 hover:text-purple-700 font-semibold"
                  >
                    View All Users
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
              <Link key={user.id} to={`/users/${user.id}`}>
              <Card variant="elevated" className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] flex items-center justify-center text-white text-xl font-bold">
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {user.role === 'admin' && (
                            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                              Admin
                            </span>
                          )}
                          {user.role === 'package_runner' && (
                            <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                              🚛 Package Runner
                            </span>
                          )}
                          {user.role === 'vendor' && (
                            <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                              🏪 Vendor
                            </span>
                          )}
                          {(user.role === 'courier' || user.courierProfile) && (
                            <>
                              <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                                Courier
                              </span>
                              {user.courierProfile?.online && (
                                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                  Online
                                </span>
                              )}
                              {user.courierProfile?.vehicleType && (
                                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold capitalize">
                                  {user.courierProfile.vehicleType}
                                </span>
                              )}
                            </>
                          )}
                          {user.role === 'customer' && (
                            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                              Customer
                            </span>
                          )}
                          {!user.role && !user.courierProfile && (
                            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                              Customer
                            </span>
                          )}
                          {user.banned && (
                            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                              🚫 Banned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditRoleUser(user)}
                        className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-semibold"
                      >
                        Edit Role
                      </button>
                      <button
                        onClick={() => setBanUser(user)}
                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-semibold ${
                          user.banned
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {user.banned ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <EditRoleModal
        user={editRoleUser!}
        isOpen={!!editRoleUser}
        onClose={() => setEditRoleUser(null)}
        onSuccess={() => {
          loadUsers()
          setEditRoleUser(null)
        }}
      />

      <BanUserModal
        user={banUser!}
        isOpen={!!banUser}
        onClose={() => setBanUser(null)}
        onSuccess={() => {
          loadUsers()
          setBanUser(null)
        }}
      />
    </div>
  )
}
