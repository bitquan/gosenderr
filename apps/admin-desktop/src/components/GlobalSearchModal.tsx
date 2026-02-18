import { useEffect, useMemo, useState, type ComponentType, type ReactNode, type MouseEventHandler, type ChangeEvent } from 'react'
import { collection, getDocs, limit, query } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../lib/firebase'

interface SearchResult {
  id: string
  title: string
  subtitle?: string
  href?: string
  type: 'user' | 'order' | 'job'
}

interface LinkCompatProps {
  to: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  className?: string
  children: ReactNode
}

const LinkCompat = Link as unknown as ComponentType<LinkCompatProps>

export default function GlobalSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [queryText, setQueryText] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])

  useEffect(() => {
    if (!open) return
    setQueryText('')
    setResults([])
    const load = async () => {
      setLoading(true)
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)))
        const ordersSnap = await getDocs(query(collection(db, 'orders'), limit(50)))
        const jobsSnap = await getDocs(query(collection(db, 'jobs'), limit(50)))

        const users = usersSnap.docs.map(doc => ({
          id: doc.id,
          title: doc.data().email || doc.id,
          subtitle: doc.data().role || 'user',
          href: `/users/${doc.id}`,
          type: 'user' as const
        }))

        const orders = ordersSnap.docs.map(doc => ({
          id: doc.id,
          title: `Order ${doc.id.slice(0, 6)}`,
          subtitle: doc.data().customerEmail || doc.data().customerId || 'order',
          href: `/marketplace-orders/${doc.id}`,
          type: 'order' as const
        }))

        const jobs = jobsSnap.docs.map(doc => ({
          id: doc.id,
          title: `Job ${doc.id.slice(0, 6)}`,
          subtitle: doc.data().createdByEmail || doc.data().createdByUid || 'job',
          href: `/jobs?jobId=${doc.id}`,
          type: 'job' as const
        }))

        setResults([...users, ...orders, ...jobs])
      } catch (error) {
        console.error('Global search failed:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [open])

  const filtered = useMemo(() => {
    if (!queryText) return results.slice(0, 20)
    const q = queryText.toLowerCase()
    return results.filter((r: SearchResult) =>
      r.id.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.subtitle?.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [queryText, results])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9998] bg-black/40 flex items-start justify-center pt-24" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <input
            autoFocus
            value={queryText}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQueryText(e.target.value)}
            placeholder="Search users, orders, jobs..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
          >
            Esc
          </button>
        </div>

        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading results...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No results</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((result: SearchResult) => (
                result.href ? (
                  <LinkCompat
                    key={`${result.type}-${result.id}`}
                    to={result.href}
                    onClick={onClose}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{result.title}</p>
                      <p className="text-xs text-gray-500">{result.subtitle}</p>
                    </div>
                    <span className="text-xs uppercase text-gray-400">{result.type}</span>
                  </LinkCompat>
                ) : (
                  <div key={`${result.type}-${result.id}`} className="flex items-center justify-between p-3 rounded-xl">
                    <div>
                      <p className="font-semibold text-gray-900">{result.title}</p>
                      <p className="text-xs text-gray-500">{result.subtitle}</p>
                    </div>
                    <span className="text-xs uppercase text-gray-400">{result.type}</span>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
