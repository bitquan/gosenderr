import { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  query,
  onSnapshot,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type EquipmentType =
  | 'insulated_bag'
  | 'cooler'
  | 'hot_bag'
  | 'drink_carrier'
  | 'dolly'
  | 'straps'
  | 'furniture_blankets'

type CourierEquipmentItem = {
  has?: boolean
  photoUrl?: string
  approved?: boolean
  approvedAt?: unknown
  rejectedReason?: string
}

type CourierCapabilities = {
  canDeliverHot: boolean
  canDeliverCold: boolean
  canDeliverFrozen: boolean
  canDeliverDrinks: boolean
  canDeliverHeavy: boolean
  canDeliverFurniture: boolean
}

type CourierProfileShape = {
  status?: string
  phone?: string
  vehicleType?: string
  vehicleDetails?: {
    make?: string
    model?: string
    year?: string
    licensePlate?: string
  }
  equipment?: Partial<Record<EquipmentType, CourierEquipmentItem>> | string[]
  capabilities?: Partial<CourierCapabilities>
  availability?: string
  appliedAt?: unknown
  approvedAt?: unknown
  rejectedAt?: unknown
  rejectionReason?: string
  documents?: Array<{
    label: string
    url: string
    name: string
    contentType: string
    uploadedAt?: unknown
  }>
}

interface Courier {
  id: string
  email: string
  displayName?: string
  role?: string
  courierProfile?: CourierProfileShape
  courierProfileV1?: CourierProfileShape
}

const EQUIPMENT_TYPES: EquipmentType[] = [
  'insulated_bag',
  'cooler',
  'hot_bag',
  'drink_carrier',
  'dolly',
  'straps',
  'furniture_blankets',
]

const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  insulated_bag: 'Insulated Bag',
  cooler: 'Cooler',
  hot_bag: 'Hot Bag',
  drink_carrier: 'Drink Carrier',
  dolly: 'Dolly',
  straps: 'Straps',
  furniture_blankets: 'Furniture Blankets',
}

const CAPABILITY_LABELS: Array<{key: keyof CourierCapabilities; label: string}> = [
  {key: 'canDeliverHot', label: 'Hot Delivery'},
  {key: 'canDeliverCold', label: 'Cold Delivery'},
  {key: 'canDeliverFrozen', label: 'Frozen Delivery'},
  {key: 'canDeliverDrinks', label: 'Drink Delivery'},
  {key: 'canDeliverHeavy', label: 'Heavy Lift'},
  {key: 'canDeliverFurniture', label: 'Furniture Ready'},
]

const buildDefaultEquipment = (): Record<EquipmentType, CourierEquipmentItem> =>
  Object.fromEntries(
    EQUIPMENT_TYPES.map(type => [type, {has: false, approved: false}]),
  ) as Record<EquipmentType, CourierEquipmentItem>

const normalizeEquipment = (
  value: Partial<Record<EquipmentType, CourierEquipmentItem>> | string[] | undefined,
): Record<EquipmentType, CourierEquipmentItem> => {
  const normalized = buildDefaultEquipment()

  if (!value) {
    return normalized
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item !== 'string') {
        continue
      }
      const key = item.trim().toLowerCase().replace(/\s+/g, '_') as EquipmentType
      if (EQUIPMENT_TYPES.includes(key)) {
        normalized[key] = {has: true, approved: false}
      }
    }
    return normalized
  }

  for (const type of EQUIPMENT_TYPES) {
    const raw = value[type]
    if (!raw || typeof raw !== 'object') {
      continue
    }
    normalized[type] = {
      has: Boolean(raw.has),
      photoUrl: typeof raw.photoUrl === 'string' ? raw.photoUrl : undefined,
      approved: Boolean(raw.approved),
      approvedAt: raw.approvedAt,
      rejectedReason: typeof raw.rejectedReason === 'string' ? raw.rejectedReason : undefined,
    }
  }

  return normalized
}

const deriveCapabilities = (
  equipment: Record<EquipmentType, CourierEquipmentItem>,
): CourierCapabilities => ({
  canDeliverHot: Boolean(equipment.hot_bag.approved || equipment.insulated_bag.approved),
  canDeliverCold: Boolean(equipment.cooler.approved || equipment.insulated_bag.approved),
  canDeliverFrozen: Boolean(equipment.cooler.approved),
  canDeliverDrinks: Boolean(equipment.drink_carrier.approved),
  canDeliverHeavy: Boolean(equipment.dolly.approved && equipment.straps.approved),
  canDeliverFurniture: Boolean(
    equipment.dolly.approved &&
      equipment.straps.approved &&
      equipment.furniture_blankets.approved,
  ),
})

const resolveProfile = (courier: Courier): CourierProfileShape => {
  const profile = courier.courierProfile ?? {}
  const profileV1 = courier.courierProfileV1 ?? {}
  const merged = {
    ...profile,
    ...profileV1,
  }

  const equipment = normalizeEquipment(profileV1.equipment ?? profile.equipment)
  const capabilities = {
    ...deriveCapabilities(equipment),
    ...(profile.capabilities ?? {}),
    ...(profileV1.capabilities ?? {}),
  } as CourierCapabilities

  return {
    ...merged,
    equipment,
    capabilities,
  }
}

const toDateLabel = (value: unknown): string => {
  if (!value) {
    return 'N/A'
  }
  if (value instanceof Date) {
    return value.toLocaleDateString()
  }
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString()
    }
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as {toDate?: unknown}).toDate === 'function'
  ) {
    const maybeDate = (value as {toDate: () => Date}).toDate()
    if (maybeDate instanceof Date) {
      return maybeDate.toLocaleDateString()
    }
  }
  return 'N/A'
}

const getEquipmentState = (item: CourierEquipmentItem): 'not_uploaded' | 'pending_review' | 'approved' | 'rejected' => {
  const hasUpload = Boolean(item.has || item.photoUrl)
  if (!hasUpload) {
    return 'not_uploaded'
  }
  if (item.approved) {
    return 'approved'
  }
  if (item.rejectedReason) {
    return 'rejected'
  }
  return 'pending_review'
}

export default function CourierApprovalPage() {
  const { user } = useAuth()
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [processing, setProcessing] = useState<string | null>(null)
  const [equipmentProcessing, setEquipmentProcessing] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCouriers, setSelectedCouriers] = useState<string[]>([])
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingCourierId, setRejectingCourierId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'))

    const unsubscribe = onSnapshot(usersQuery, snapshot => {
      const couriersData = snapshot.docs
        .map(document => ({ id: document.id, ...document.data() } as Courier))
        .filter(entry => entry.role === 'courier' && (entry.courierProfile || entry.courierProfileV1))

      setCouriers(couriersData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const profileByCourierId = useMemo(() => {
    const map = new Map<string, CourierProfileShape>()
    for (const courier of couriers) {
      map.set(courier.id, resolveProfile(courier))
    }
    return map
  }, [couriers])

  const logAdminAction = async (action: string, courierId: string, payload?: Record<string, unknown>) => {
    await addDoc(collection(db, 'adminLogs'), {
      action,
      adminId: user?.uid || 'admin',
      adminEmail: user?.email || 'admin',
      userId: courierId,
      timestamp: new Date(),
      ...payload,
    })
  }

  const handleApprove = async (courierId: string, silent = false) => {
    setProcessing(courierId)
    try {
      await updateDoc(doc(db, 'users', courierId), {
        'courierProfile.status': 'approved',
        'courierProfile.approvedAt': serverTimestamp(),
        'courierProfile.approvedBy': user?.uid || 'admin',
        'courierProfile.rejectedAt': null,
        'courierProfile.rejectedBy': null,
        'courierProfile.rejectionReason': null,
        'courierProfileV1.status': 'approved',
        'courierProfileV1.approvedAt': serverTimestamp(),
        'courierProfileV1.approvedBy': user?.uid || 'admin',
        'courierProfileV1.rejectedAt': null,
        'courierProfileV1.rejectedBy': null,
        'courierProfileV1.rejectionReason': null,
      })
      await logAdminAction('courier_application_approved', courierId, {
        newStatus: 'approved',
      })
      if (!silent) {
        alert('Courier approved successfully')
      }
    } catch (error: unknown) {
      console.error('Error approving courier:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to approve: ${message}`)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (courierId: string, reason?: string) => {
    if (!reason) {
      setRejectingCourierId(courierId)
      setShowRejectModal(true)
      return
    }

    setProcessing(courierId)
    try {
      await updateDoc(doc(db, 'users', courierId), {
        'courierProfile.status': 'rejected',
        'courierProfile.rejectedAt': serverTimestamp(),
        'courierProfile.rejectedBy': user?.uid || 'admin',
        'courierProfile.rejectionReason': reason,
        'courierProfile.approvedAt': null,
        'courierProfile.approvedBy': null,
        'courierProfileV1.status': 'rejected',
        'courierProfileV1.rejectedAt': serverTimestamp(),
        'courierProfileV1.rejectedBy': user?.uid || 'admin',
        'courierProfileV1.rejectionReason': reason,
        'courierProfileV1.approvedAt': null,
        'courierProfileV1.approvedBy': null,
      })
      await logAdminAction('courier_application_rejected', courierId, {
        newStatus: 'rejected',
        reason,
      })
      alert('Courier application rejected')
      setShowRejectModal(false)
      setRejectingCourierId(null)
      setRejectionReason('')
    } catch (error: unknown) {
      console.error('Error rejecting courier:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to reject: ${message}`)
    } finally {
      setProcessing(null)
    }
  }

  const handleEquipmentDecision = async (
    courier: Courier,
    equipmentType: EquipmentType,
    decision: 'approved' | 'rejected',
  ) => {
    const key = `${courier.id}:${equipmentType}`
    const reason =
      decision === 'rejected'
        ? window.prompt('Reason for rejecting this equipment photo? (required)')?.trim()
        : undefined

    if (decision === 'rejected' && !reason) {
      return
    }

    const profile = profileByCourierId.get(courier.id) ?? resolveProfile(courier)
    const equipment = normalizeEquipment(profile.equipment)
    equipment[equipmentType] = {
      ...equipment[equipmentType],
      has: true,
      approved: decision === 'approved',
      rejectedReason: decision === 'rejected' ? reason : undefined,
    }
    const capabilities = deriveCapabilities(equipment)

    setEquipmentProcessing(key)
    try {
      await updateDoc(doc(db, 'users', courier.id), {
        [`courierProfile.equipment.${equipmentType}.has`]: true,
        [`courierProfile.equipment.${equipmentType}.approved`]: decision === 'approved',
        [`courierProfile.equipment.${equipmentType}.approvedAt`]:
          decision === 'approved' ? serverTimestamp() : null,
        [`courierProfile.equipment.${equipmentType}.rejectedReason`]:
          decision === 'rejected' ? reason : null,
        [`courierProfileV1.equipment.${equipmentType}.has`]: true,
        [`courierProfileV1.equipment.${equipmentType}.approved`]: decision === 'approved',
        [`courierProfileV1.equipment.${equipmentType}.approvedAt`]:
          decision === 'approved' ? serverTimestamp() : null,
        [`courierProfileV1.equipment.${equipmentType}.rejectedReason`]:
          decision === 'rejected' ? reason : null,
        'courierProfile.capabilities': capabilities,
        'courierProfileV1.capabilities': capabilities,
        'courierProfile.updatedAt': serverTimestamp(),
        'courierProfileV1.updatedAt': serverTimestamp(),
      })

      await logAdminAction(
        decision === 'approved' ? 'courier_equipment_approved' : 'courier_equipment_rejected',
        courier.id,
        {
          equipmentType,
          reason: reason ?? null,
        },
      )

      alert(
        decision === 'approved'
          ? `${EQUIPMENT_LABELS[equipmentType]} approved.`
          : `${EQUIPMENT_LABELS[equipmentType]} rejected.`,
      )
    } catch (error: unknown) {
      console.error('Error updating equipment:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to update equipment: ${message}`)
    } finally {
      setEquipmentProcessing(null)
    }
  }

  const handleBulkApprove = async () => {
    if (!window.confirm(`Approve ${selectedCouriers.length} couriers?`)) return

    for (const courierId of selectedCouriers) {
      await handleApprove(courierId, true)
    }
    setSelectedCouriers([])
    alert('Selected couriers approved.')
  }

  const toggleSelectCourier = (courierId: string) => {
    setSelectedCouriers(prev =>
      prev.includes(courierId)
        ? prev.filter(id => id !== courierId)
        : [...prev, courierId],
    )
  }

  const filteredCouriers = couriers
    .filter(courier => {
      if (filter === 'all') return true
      const profile = profileByCourierId.get(courier.id)
      return profile?.status === filter
    })
    .filter(courier => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      const profile = profileByCourierId.get(courier.id)
      return (
        courier.email?.toLowerCase().includes(q) ||
        courier.displayName?.toLowerCase().includes(q) ||
        profile?.phone?.includes(q)
      )
    })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <p className="text-gray-600">Loading couriers...</p>
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
          <h1 className="text-3xl font-bold mb-2">⚡ Courier Applications</h1>
          <p className="text-purple-100">{filteredCouriers.length} applications</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 flex-wrap">
          {[
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'All', value: 'all' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as 'pending' | 'approved' | 'rejected' | 'all')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all capitalize ${
                filter === tab.value
                  ? 'bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {selectedCouriers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center justify-between">
            <span className="text-gray-700 font-semibold">
              {selectedCouriers.length} courier{selectedCouriers.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Approve Selected
              </button>
              <button
                onClick={() => setSelectedCouriers([])}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {filteredCouriers.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">⚡</div>
              <p className="text-gray-600 text-lg">
                No {filter !== 'all' ? filter : ''} applications
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCouriers.map(courier => {
              const profile = profileByCourierId.get(courier.id) ?? resolveProfile(courier)
              const equipment = normalizeEquipment(profile.equipment)
              const capabilities = profile.capabilities ?? deriveCapabilities(equipment)
              const enabledCapabilities = CAPABILITY_LABELS
                .filter(item => Boolean(capabilities[item.key]))
                .map(item => item.label)
              const isSelected = selectedCouriers.includes(courier.id)
              const isPending = profile?.status === 'pending'

              return (
                <Card key={courier.id} variant="elevated">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      {isPending && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectCourier(courier.id)}
                          className="mt-2 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                      )}

                      <Avatar
                        fallback={courier.displayName || courier.email}
                        size="lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-bold text-gray-900 text-lg">
                              {courier.displayName || 'No name'}
                            </p>
                            <p className="text-sm text-gray-500">{courier.email}</p>
                          </div>
                          <StatusBadge
                            status={
                              profile?.status === 'approved' ? 'completed' :
                              profile?.status === 'rejected' ? 'cancelled' :
                              'pending'
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 mb-4">
                      {profile?.phone && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Phone</p>
                          <p className="font-medium">{profile.phone}</p>
                        </div>
                      )}

                      {profile?.vehicleType && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Vehicle Type</p>
                          <p className="font-medium capitalize">{profile.vehicleType}</p>
                        </div>
                      )}

                      {profile?.vehicleDetails && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Vehicle Details</p>
                          <p className="font-medium">
                            {profile.vehicleDetails.year} {profile.vehicleDetails.make} {profile.vehicleDetails.model}
                          </p>
                          {profile.vehicleDetails.licensePlate && (
                            <p className="text-xs text-gray-500 mt-1">
                              Plate: {profile.vehicleDetails.licensePlate}
                            </p>
                          )}
                        </div>
                      )}

                      {profile?.availability && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Availability</p>
                          <p className="font-medium">{profile.availability}</p>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-white border border-gray-200 rounded-xl mb-4">
                      <p className="text-xs text-gray-500 mb-2">Equipment Review</p>
                      <div className="space-y-2">
                        {EQUIPMENT_TYPES.map(type => {
                          const item = equipment[type]
                          const state = getEquipmentState(item)
                          const processingKey = `${courier.id}:${type}`
                          return (
                            <div
                              key={`${courier.id}.${type}`}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-gray-100 rounded-lg p-2"
                            >
                              <div>
                                <p className="font-medium text-sm text-gray-900">{EQUIPMENT_LABELS[type]}</p>
                                <p className="text-xs text-gray-500">
                                  {state === 'approved'
                                    ? 'approved'
                                    : state === 'rejected'
                                      ? `rejected${item.rejectedReason ? `: ${item.rejectedReason}` : ''}`
                                      : state === 'pending_review'
                                        ? 'pending review'
                                        : 'not uploaded'}
                                </p>
                                {item.photoUrl ? (
                                  <a
                                    href={item.photoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-indigo-600 hover:underline"
                                  >
                                    View upload
                                  </a>
                                ) : null}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEquipmentDecision(courier, type, 'approved')}
                                  disabled={equipmentProcessing === processingKey || state === 'not_uploaded'}
                                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleEquipmentDecision(courier, type, 'rejected')}
                                  disabled={equipmentProcessing === processingKey || state === 'not_uploaded'}
                                  className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl mb-4">
                      <p className="text-xs text-gray-500 mb-1">Unlocked badges</p>
                      <p className="font-medium text-sm text-gray-900">
                        {enabledCapabilities.length > 0 ? enabledCapabilities.join(', ') : 'No badges unlocked yet'}
                      </p>
                    </div>

                    {profile?.rejectionReason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                        <p className="text-xs text-red-500 mb-1">Rejection Reason</p>
                        <p className="text-sm text-red-900">{profile.rejectionReason}</p>
                      </div>
                    )}

                    {profile?.documents && profile.documents.length > 0 && (
                      <div className="p-3 bg-white border border-gray-200 rounded-xl mb-4">
                        <p className="text-xs text-gray-500 mb-2">Uploaded Documents</p>
                        <div className="space-y-2">
                          {profile.documents.map(docItem => (
                            <div key={docItem.url} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">
                                {docItem.label}: {docItem.name}
                              </span>
                              <a
                                href={docItem.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline"
                              >
                                View
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile?.status === 'pending' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(courier.id)}
                          disabled={processing === courier.id}
                          className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all disabled:opacity-50"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleReject(courier.id)}
                          disabled={processing === courier.id}
                          className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
                        >
                          ❌ Reject
                        </button>
                      </div>
                    )}

                    {Boolean(profile?.approvedAt) && (
                      <div className="text-xs text-gray-500 mt-3">
                        Approved on {toDateLabel(profile.approvedAt)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reject Courier Application</h2>

            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                ⚠️ This will reject the courier application. They will be notified.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={event => setRejectionReason(event.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectingCourierId(null)
                  setRejectionReason('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectingCourierId) {
                    handleReject(rejectingCourierId, rejectionReason)
                  }
                }}
                disabled={!rejectionReason.trim() || processing !== null}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
