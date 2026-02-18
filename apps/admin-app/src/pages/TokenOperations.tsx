import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'
import {
  adminGetTokenWalletView,
  adminListTokenLedger,
  adjustTokenWalletBalance,
} from '../lib/cloudFunctions'
import { exportToCSV } from '../lib/csvExport'

type TokenWallet = {
  uid: string
  available: number
  reserved: number
  lifetimePurchased: number
  lifetimeSpent: number
  lifetimeAdjusted: number
}

type TokenTarget = {
  uid: string
  email: string | null
  displayName: string | null
  role: string | null
}

type LedgerRow = Record<string, unknown> & {
  id: string
  uid?: string
  type?: string
  action?: string
  amount?: number
  reason?: string
  idempotencyKey?: string
  reservationId?: string
  metadata?: Record<string, unknown>
  createdAt?: unknown
}

function toDisplayDate(value: unknown): string {
  if (!value) return '—'

  if (typeof value === 'object' && value !== null && 'toDate' in (value as Record<string, unknown>)) {
    const maybeDate = (value as { toDate?: () => Date }).toDate?.()
    if (maybeDate) return maybeDate.toLocaleString()
  }

  if (typeof value === 'object' && value !== null && 'seconds' in (value as Record<string, unknown>)) {
    const seconds = Number((value as { seconds?: unknown }).seconds || 0)
    if (Number.isFinite(seconds)) {
      return new Date(seconds * 1000).toLocaleString()
    }
  }

  const parsed = Date.parse(String(value))
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toLocaleString()
  }

  return String(value)
}

function generateIdempotencyKey(): string {
  const bytes = new Uint8Array(12)
  globalThis.crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  return `admin_token_${hex}`
}

export default function TokenOperationsPage() {
  const [targetInput, setTargetInput] = useState('')
  const [target, setTarget] = useState<TokenTarget | null>(null)
  const [wallet, setWallet] = useState<TokenWallet | null>(null)
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([])

  const [actionFilter, setActionFilter] = useState('all')
  const [ledgerScope, setLedgerScope] = useState<'selected' | 'all'>('selected')
  const [loadingWallet, setLoadingWallet] = useState(false)
  const [loadingLedger, setLoadingLedger] = useState(false)

  const [grantAmount, setGrantAmount] = useState(10)
  const [grantDirection, setGrantDirection] = useState<'grant' | 'revoke'>('grant')
  const [grantReason, setGrantReason] = useState('manual_admin_adjustment')
  const [submittingGrant, setSubmittingGrant] = useState(false)

  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isEmail = targetInput.includes('@')
  const canLookup = targetInput.trim().length > 2

  const stats = useMemo(() => {
    const cashFeeRows = ledgerRows.filter((row) => row.action === 'cash_fee')
    const adminRows = ledgerRows.filter((row) => row.action === 'admin_adjustment')
    const totalAmount = ledgerRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)

    return {
      count: ledgerRows.length,
      cashFeeCount: cashFeeRows.length,
      adminAdjustCount: adminRows.length,
      totalAmount,
    }
  }, [ledgerRows])

  const lookupWallet = async () => {
    if (!canLookup) return

    setLoadingWallet(true)
    setError(null)
    setMessage(null)

    try {
      const payload = isEmail
        ? { targetEmail: targetInput.trim().toLowerCase() }
        : { targetUid: targetInput.trim() }

      const result = await adminGetTokenWalletView(payload)
      setTarget(result.user)
      setWallet(result.wallet as TokenWallet)
      setMessage(`Loaded wallet for ${result.user.email || result.user.uid}`)

      await loadLedger('selected', result.user.uid, actionFilter)
    } catch (err: any) {
      setError(err?.message || 'Failed to load token wallet')
      setTarget(null)
      setWallet(null)
      setLedgerRows([])
    } finally {
      setLoadingWallet(false)
    }
  }

  const loadLedger = async (
    scope = ledgerScope,
    uid = target?.uid,
    action = actionFilter,
  ) => {
    setLoadingLedger(true)
    setError(null)

    try {
      const request: {
        targetUid?: string
        action?: string
        includeCashFeeOnly?: boolean
        limit?: number
      } = {
        limit: 150,
      }

      if (scope === 'selected' && uid) {
        request.targetUid = uid
      }

      if (action !== 'all') {
        if (action === 'cash_fee') {
          request.includeCashFeeOnly = true
        } else {
          request.action = action
        }
      }

      const result = await adminListTokenLedger(request)
      setLedgerRows((result.rows || []) as LedgerRow[])
    } catch (err: any) {
      setError(err?.message || 'Failed to load token ledger')
      setLedgerRows([])
    } finally {
      setLoadingLedger(false)
    }
  }

  const submitAdjustment = async () => {
    if (!target?.uid) {
      setError('Load a target account first')
      return
    }

    const amount = Math.max(1, Math.floor(Math.abs(grantAmount || 0)))
    const signedDelta = grantDirection === 'grant' ? amount : -amount

    setSubmittingGrant(true)
    setError(null)
    setMessage(null)

    try {
      const response = await adjustTokenWalletBalance({
        targetUid: target.uid,
        delta: signedDelta,
        reason: grantReason.trim() || 'manual_admin_adjustment',
        idempotencyKey: generateIdempotencyKey(),
        metadata: {
          source: 'admin_token_operations_panel',
        },
      })

      setWallet(response as TokenWallet)
      setMessage(
        `${grantDirection === 'grant' ? 'Granted' : 'Revoked'} ${amount} token${amount === 1 ? '' : 's'} for ${target.email || target.uid}`,
      )

      await loadLedger()
    } catch (err: any) {
      setError(err?.message || 'Failed to adjust token wallet')
    } finally {
      setSubmittingGrant(false)
    }
  }

  const exportLedger = () => {
    exportToCSV(
      ledgerRows.map((row) => ({
        id: row.id,
        uid: row.uid || '',
        type: row.type || '',
        action: row.action || '',
        amount: Number(row.amount || 0),
        reason: row.reason || '',
        idempotencyKey: row.idempotencyKey || '',
        reservationId: row.reservationId || '',
        orderId: String((row.metadata || {}).orderId || ''),
        jobId: String((row.metadata || {}).jobId || ''),
        createdAt: toDisplayDate(row.createdAt),
      })),
      'token-ledger',
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Token Operations</h1>
        <p className="text-gray-600 mt-2">
          Grant or revoke tokens for any account and track the full token ledger, including cash-fee jobs.
        </p>
      </div>

      {message && <div className="rounded-lg bg-green-50 text-green-800 px-4 py-3 text-sm">{message}</div>}
      {error && <div className="rounded-lg bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Account Lookup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              className="md:col-span-3 w-full p-2 border rounded"
              placeholder="Enter user UID or email"
              value={targetInput}
              onChange={(event) => setTargetInput(event.target.value)}
            />
            <button
              onClick={lookupWallet}
              disabled={!canLookup || loadingWallet}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loadingWallet ? 'Loading...' : 'Load Wallet'}
            </button>
          </div>

          {target && wallet && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded border p-3 bg-gray-50">
                <div><span className="font-semibold">User:</span> {target.displayName || '—'}</div>
                <div><span className="font-semibold">Email:</span> {target.email || '—'}</div>
                <div><span className="font-semibold">UID:</span> {target.uid}</div>
                <div><span className="font-semibold">Role:</span> {target.role || '—'}</div>
              </div>
              <div className="rounded border p-3 bg-gray-50">
                <div><span className="font-semibold">Available:</span> {wallet.available}</div>
                <div><span className="font-semibold">Reserved:</span> {wallet.reserved}</div>
                <div><span className="font-semibold">Lifetime Purchased:</span> {wallet.lifetimePurchased}</div>
                <div><span className="font-semibold">Lifetime Spent:</span> {wallet.lifetimeSpent}</div>
                <div><span className="font-semibold">Lifetime Adjusted:</span> {wallet.lifetimeAdjusted}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Token Adjustment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              className="w-full p-2 border rounded"
              value={grantDirection}
              onChange={(event) => setGrantDirection(event.target.value as 'grant' | 'revoke')}
            >
              <option value="grant">Grant</option>
              <option value="revoke">Revoke</option>
            </select>
            <input
              className="w-full p-2 border rounded"
              type="number"
              min={1}
              step={1}
              value={grantAmount}
              onChange={(event) => setGrantAmount(Number(event.target.value || 0))}
            />
            <input
              className="w-full p-2 border rounded md:col-span-2"
              value={grantReason}
              onChange={(event) => setGrantReason(event.target.value)}
              placeholder="Reason"
            />
          </div>

          <button
            onClick={submitAdjustment}
            disabled={!target?.uid || submittingGrant}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {submittingGrant ? 'Submitting...' : 'Apply Adjustment'}
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Token Ledger Audit Trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              className="w-full p-2 border rounded"
              value={ledgerScope}
              onChange={(event) => setLedgerScope(event.target.value as 'selected' | 'all')}
            >
              <option value="selected">Selected Account</option>
              <option value="all">All Accounts</option>
            </select>

            <select
              className="w-full p-2 border rounded"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
            >
              <option value="all">All Actions</option>
              <option value="cash_fee">Cash-Fee Jobs</option>
              <option value="admin_adjustment">Admin Adjustments</option>
              <option value="reserve">Reserve</option>
              <option value="commit">Commit</option>
              <option value="release">Release</option>
              <option value="refund">Refund</option>
            </select>

            <button
              onClick={() => loadLedger()}
              disabled={loadingLedger || (ledgerScope === 'selected' && !target?.uid)}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loadingLedger ? 'Loading...' : 'Refresh Ledger'}
            </button>

            <button
              onClick={exportLedger}
              disabled={!ledgerRows.length}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded border p-3 bg-gray-50">
              <p className="text-gray-500">Rows</p>
              <p className="text-lg font-semibold">{stats.count}</p>
            </div>
            <div className="rounded border p-3 bg-gray-50">
              <p className="text-gray-500">Cash-Fee Jobs</p>
              <p className="text-lg font-semibold">{stats.cashFeeCount}</p>
            </div>
            <div className="rounded border p-3 bg-gray-50">
              <p className="text-gray-500">Admin Adjustments</p>
              <p className="text-lg font-semibold">{stats.adminAdjustCount}</p>
            </div>
            <div className="rounded border p-3 bg-gray-50">
              <p className="text-gray-500">Sum Amount</p>
              <p className="text-lg font-semibold">{stats.totalAmount}</p>
            </div>
          </div>

          <div className="overflow-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">UID</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Action</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Reason / Ref</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((row) => {
                  const metadata = (row.metadata || {}) as Record<string, unknown>
                  const reasonOrRef =
                    String(row.reason || '') ||
                    String(metadata.orderId || metadata.jobId || row.reservationId || '')

                  return (
                    <tr key={row.id} className="border-t">
                      <td className="p-2 whitespace-nowrap">{toDisplayDate(row.createdAt)}</td>
                      <td className="p-2 font-mono text-xs">{String(row.uid || '—')}</td>
                      <td className="p-2">{String(row.type || '—')}</td>
                      <td className="p-2">{String(row.action || '—')}</td>
                      <td className="p-2">{Number(row.amount || 0)}</td>
                      <td className="p-2">{reasonOrRef || '—'}</td>
                    </tr>
                  )
                })}
                {!ledgerRows.length && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500">
                      No ledger rows found for the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
