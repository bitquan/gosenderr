import { useEffect, useState } from 'react'
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { db, auth, storage } from '../lib/firebase'
import { updateProfile } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useAuth } from '../hooks/useAuth'
import { useAdmin } from '../hooks/useAdmin'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { formatCurrency } from '../lib/utils'

interface CourierProfile {
  online: boolean
  vehicleType: string
  currentLocation?: {
    lat: number
    lng: number
  }
}

function sanitizeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    const parsed = new URL(value, window.location.origin)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'blob:') {
      return value
    }
    if (parsed.protocol === 'data:' && value.startsWith('data:image/')) {
      return value
    }
  } catch {
    return null
  }

  return null
}

export default function CourierProfilePage() {
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const [profile, setProfile] = useState<CourierProfile | null>(null)
  const [vehicleType, setVehicleType] = useState<string>('car')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [earnings, setEarnings] = useState({ total: 0, completed: 0, thisMonth: 0 })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const profileImageUrl = sanitizeImageUrl(photoPreview ?? user?.photoURL)
  const encodedProfileImageUrl = profileImageUrl ? encodeURI(profileImageUrl) : null

  useEffect(() => {
    if (!user) return

    // Load courier profile
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          const courierProfile = data.courierProfile as CourierProfile || { online: false, vehicleType: 'car' }
          setProfile(courierProfile)
          setVehicleType(courierProfile.vehicleType || 'car')
        }
        setLoading(false)
      },
      (error) => {
        console.error('Error loading profile:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!user) return

    // Load earnings stats
    const loadEarnings = async () => {
      try {
        const q = query(
          collection(db, 'jobs'),
          where('courierUid', '==', user.uid),
          where('status', '==', 'completed')
        )
        
        const snapshot = await getDocs(q)
        const jobs = snapshot.docs.map(doc => doc.data())
        
        const total = jobs.reduce((sum, job) => sum + (job.agreedFee || 0), 0)
        const completed = jobs.length

        // This month earnings
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const thisMonth = jobs
          .filter(job => {
            const completedAt = job.completedAt?.toDate?.()
            return completedAt && completedAt >= monthStart
          })
          .reduce((sum, job) => sum + (job.agreedFee || 0), 0)

        setEarnings({ total, completed, thisMonth })
      } catch (error) {
        console.error('Error loading earnings:', error)
      }
    }

    loadEarnings()
  }, [user])

  const handleSaveProfile = async () => {
    if (!user || !profile) return

    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'courierProfile.vehicleType': vehicleType
      })
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleUploadPhoto = async () => {
    if (!user || !photoFile) return

    setUploadingPhoto(true)
    try {
      const fileName = `profilePhotos/${user.uid}/${Date.now()}_${photoFile.name}`
      const storageRef = ref(storage, fileName)
      await uploadBytes(storageRef, photoFile)
      const url = await getDownloadURL(storageRef)

      await updateProfile(user, { photoURL: url })
      await updateDoc(doc(db, 'users', user.uid), {
        profilePhotoUrl: url,
        updatedAt: serverTimestamp(),
      })

      setPhotoFile(null)
      setPhotoPreview(null)
    } catch (error) {
      console.error('Error uploading profile photo:', error)
      alert('Failed to upload photo. Please try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSignOut = async () => {
    if (!window.confirm('Sign out of your account?')) return
    
    try {
      await auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
      alert('Failed to sign out. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-purple-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-purple-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{isAdmin ? '🔧 Admin Profile' : 'Profile'}</h1>
          <p className="text-purple-100">Manage your {isAdmin ? 'admin' : 'courier'} account</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 space-y-4">
        {/* User Info Card */}
        <Card variant="elevated" className="animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] flex items-center justify-center text-3xl text-white shadow-lg overflow-hidden">
                {encodedProfileImageUrl ? (
                  <img
                    src={encodedProfileImageUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{isAdmin ? '🔧' : '👤'}</span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user?.email}</h2>
                <p className="text-sm text-gray-500">{isAdmin ? 'Admin Account' : 'Courier Account'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    Choose Photo
                  </label>
                  <button
                    type="button"
                    onClick={handleUploadPhoto}
                    disabled={!photoFile || uploadingPhoto}
                    className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {uploadingPhoto ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Card - Only for couriers */}
        {!isAdmin && (
          <Card variant="elevated" className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>💰</span>
                <span>Earnings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-xs text-gray-500 mb-1">Total Earned</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    {formatCurrency(earnings.total)}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-xs text-gray-500 mb-1">This Month</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    {formatCurrency(earnings.thisMonth)}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <p className="text-xs text-gray-500 mb-1">Completed</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">
                    {earnings.completed}
                  </p>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Vehicle Settings Card - Only for couriers */}
        {!isAdmin && (
          <Card variant="elevated" className="animate-slide-up animation-delay-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🚗</span>
                <span>Vehicle Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Type
                </label>
                <select
                  id="vehicleType"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                >
                  <option value="bike">🚲 Bike</option>
                  <option value="scooter">🛵 Scooter</option>
                  <option value="car">🚗 Car</option>
                  <option value="van">🚐 Van</option>
                  <option value="truck">🚚 Truck</option>
                </select>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving || vehicleType === profile?.vehicleType}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  saving || vehicleType === profile?.vehicleType
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white hover:shadow-xl hover:scale-105'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </CardContent>
        </Card>
        )}

        {/* Status Card */}
        <Card variant="elevated" className="animate-slide-up animation-delay-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📊</span>
              <span>Account Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">Account Status</span>
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                  Active
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">Account Type</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  isAdmin
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {isAdmin ? 'Admin' : 'Courier'}
                </span>
              </div>

              {!isAdmin && (
                <>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Online Status</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      profile?.online 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {profile?.online ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Current Vehicle</span>
                    <span className="text-sm font-semibold text-gray-900 capitalize">
                      {profile?.vehicleType || 'Not Set'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card variant="elevated" className="animate-slide-up animation-delay-300">
          <CardContent className="p-6 space-y-3">
            <button
              onClick={handleSignOut}
              className="w-full py-3 px-4 rounded-xl border-2 border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-all"
            >
              Sign Out
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
