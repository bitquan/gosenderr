import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import EditRoleModal from '../components/EditRoleModal'
import BanUserModal from '../components/BanUserModal'

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
  const [filter, setFilter] = useState<'all' | 'customer' | 'courier' | 'package_runner' | 'seller' | 'admin'>('all')
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
    if (filter === 'seller') return user.role === 'seller'
    if (filter === 'customer') return user.role === 'customer' || (!user.role && !user.courierProfile)
    return true
  })

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">👥 User Management</h1>
          <p className="text-purple-100">{users.length} total users</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 flex-wrap">
          {(['all', 'customer', 'courier', 'package_runner', 'seller', 'admin'] as const).map((f) => {
            const count = users.filter(user => {
              if (f === 'all') return true
              if (f === 'admin') return user.role === 'admin'
              if (f === 'courier') return user.role === 'courier' || user.courierProfile
              if (f === 'package_runner') return user.role === 'package_runner'
              if (f === 'seller') return user.role === 'seller'
              if (f === 'customer') return user.role === 'customer' || (!user.role && !user.courierProfile)
              return false
            }).length

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
                    {f === 'package_runner' ? 'Runners' : f === 'customer' ? 'Customers' : f === 'courier' ? 'Couriers' : f === 'seller' ? 'Sellers' : f === 'admin' ? 'Admins' : 'All'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    filter === f ? 'bg-white/20' : 'bg-gray-100'
                  }`}>
                    {count}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Users List */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <Card key={user.id} variant="elevated">
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
                          {user.role === 'seller' && (
                            <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                              🏪 Seller
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
            ))}
          </div>
        )}
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
