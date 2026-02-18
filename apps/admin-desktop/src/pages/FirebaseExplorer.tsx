import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'

interface DocRow {
  id: string
  data: Record<string, any>
}

interface CollectionConfig {
  id: string
  label: string
  orderBy?: string
  previewFields?: string[]
}

const COLLECTIONS: CollectionConfig[] = [
  { id: 'users', label: 'Users', orderBy: 'createdAt', previewFields: ['email', 'name', 'role'] },
  { id: 'jobs', label: 'Jobs', orderBy: 'createdAt', previewFields: ['status', 'type'] },
  { id: 'orders', label: 'Orders', orderBy: 'createdAt', previewFields: ['status', 'total'] },
  { id: 'marketplaceItems', label: 'Marketplace Items', orderBy: 'createdAt', previewFields: ['title', 'status', 'price'] },
  { id: 'marketplaceOrders', label: 'Marketplace Orders', orderBy: 'createdAt', previewFields: ['status', 'total'] },
  { id: 'disputes', label: 'Disputes', orderBy: 'createdAt', previewFields: ['status', 'reason'] },
  { id: 'featureFlags', label: 'Feature Flags', previewFields: ['name', 'category', 'enabled'] },
  { id: 'platformSettings', label: 'Platform Settings', previewFields: ['group', 'key'] },
  { id: 'adminLogs', label: 'Admin Logs', orderBy: 'timestamp', previewFields: ['action', 'adminEmail'] },
]

export default function FirebaseExplorerPage() {
  const [collectionId, setCollectionId] = useState(COLLECTIONS[0].id)
  const [rows, setRows] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<DocRow | null>(null)
  const [docId, setDocId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const activeConfig = useMemo(
    () => COLLECTIONS.find((c) => c.id === collectionId) || COLLECTIONS[0],
    [collectionId]
  )

  const loadDocs = async () => {
    setLoading(true)
    setError(null)
    try {
      const base = collection(db, collectionId)
      const q = activeConfig.orderBy
        ? query(base, orderBy(activeConfig.orderBy, 'desc'), limit(50))
        : query(base, limit(50))
      const snap = await getDocs(q)
      const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, any> }))
      setRows(docs)
      setSelected(docs[0] || null)
    } catch (err: any) {
      console.error('Error loading collection:', err)
      setError(err?.message || 'Failed to load collection')
      setRows([])
      setSelected(null)
    } finally {
      setLoading(false)
    }
  }

  const loadById = async () => {
    if (!docId.trim()) return
    setLoading(true)
    setError(null)
    try {
      const ref = doc(db, collectionId, docId.trim())
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        setError('Document not found')
        return
      }
      const row = { id: snap.id, data: snap.data() as Record<string, any> }
      setSelected(row)
      setRows([row, ...rows.filter((r) => r.id !== row.id)])
    } catch (err: any) {
      console.error('Error loading document:', err)
      setError(err?.message || 'Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocs()
  }, [collectionId])

  const renderPreview = (row: DocRow) => {
    const fields = activeConfig.previewFields || []
    const preview = fields
      .map((field) => {
        const value = row.data?.[field]
        if (value === undefined || value === null) return null
        if (typeof value === 'object') return `${field}: [object]`
        return `${field}: ${value}`
      })
      .filter(Boolean)
      .join(' • ')
    return preview || 'No preview data'
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#0EA5E9] to-[#2563EB] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🧭 Firebase Explorer</h1>
          <p className="text-blue-100">Read-only view of Firestore collections</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                {COLLECTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                onClick={loadDocs}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh
              </button>
              <div className="flex-1" />
              <div className="flex gap-2">
                <input
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  placeholder="Load by document ID"
                  className="px-3 py-2 border border-gray-300 rounded-lg w-64"
                />
                <button
                  onClick={loadById}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                >
                  Load
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-gray-500">Loading documents…</div>
              ) : rows.length === 0 ? (
                <div className="text-sm text-gray-500">No documents found.</div>
              ) : (
                <div className="space-y-2 max-h-[70vh] overflow-auto">
                  {rows.map((row) => (
                    <button
                      key={row.id}
                      onClick={() => setSelected(row)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        selected?.id === row.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-900">{row.id}</div>
                      <div className="text-xs text-gray-600 mt-1">{renderPreview(row)}</div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selected ? (
                <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto max-h-[70vh] whitespace-pre-wrap">
                  {JSON.stringify(selected.data, null, 2)}
                </pre>
              ) : (
                <div className="text-sm text-gray-500">Select a document to view details.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
