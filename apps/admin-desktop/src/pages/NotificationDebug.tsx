import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../lib/firebase'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'

interface UserRecord {
  id: string;
  email?: string;
  role?: string;
  notificationPreferences?: Record<string, boolean>;
  fcmToken?: string;
  courierProfile?: {
    fcmToken?: string;
    status?: string;
    approved?: boolean;
  };
}

interface AdminActionLog {
  id: string;
  action: string;
  targetUserId?: string | null;
  targetToken?: string | null;
  title?: string;
  body?: string;
  apnsTopic?: string | null;
  fallbackUsed?: boolean;
  error?: {
    message?: string;
    code?: string;
    details?: unknown;
  };
  createdAt?: unknown;
}

export default function NotificationDebugPage() {
  const [lookupValue, setLookupValue] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null)

  const [testTitle, setTestTitle] = useState('GoSenderr Test')
  const [testBody, setTestBody] = useState('Admin test push')
  const [testTokenOverride, setTestTokenOverride] = useState('')
  const [testApnsTopic, setTestApnsTopic] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const [logs, setLogs] = useState<AdminActionLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)

  const effectiveToken = useMemo(() => {
    if (!userRecord) return null
    return userRecord.courierProfile?.fcmToken || userRecord.fcmToken || null
  }, [userRecord])

  const maskToken = (token?: string | null) => {
    if (!token) return '—'
    if (token.length <= 16) return token
    return `${token.slice(0, 8)}…${token.slice(-6)}`
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const loadLogs = async () => {
    setLogsLoading(true)
    setLogsError(null)
    try {
      const q = query(
        collection(db, 'adminActionLog'),
        where('action', 'in', ['send_test_push', 'send_test_push_failed']),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as AdminActionLog[]
      setLogs(data)
    } catch (error: any) {
      console.error('Failed to load notification debug logs:', error)
      setLogsError('Unable to load logs. Check Firestore indexes or permissions.')
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const handleLookup = async () => {
    const value = lookupValue.trim()
    if (!value) {
      setLookupError('Enter a user ID or email')
      return
    }

    setLookupLoading(true)
    setLookupError(null)
    setUserRecord(null)

    try {
      let userDoc: UserRecord | null = null

      if (value.includes('@')) {
        const q = query(collection(db, 'users'), where('email', '==', value), limit(1))
        const snapshot = await getDocs(q)
        const docSnap = snapshot.docs[0]
        if (docSnap) {
          const data = docSnap.data() as UserRecord
          userDoc = { ...data, id: docSnap.id }
        }
      } else {
        const docSnap = await getDoc(doc(db, 'users', value))
        if (docSnap.exists()) {
          const data = docSnap.data() as UserRecord
          userDoc = { ...data, id: docSnap.id }
        } else {
          const q = query(collection(db, 'users'), where('email', '==', value), limit(1))
          const snapshot = await getDocs(q)
          const emailSnap = snapshot.docs[0]
          if (emailSnap) {
            const data = emailSnap.data() as UserRecord
            userDoc = { ...data, id: emailSnap.id }
          }
        }
      }

      if (!userDoc) {
        setLookupError('No user found for that ID or email')
        return
      }

      setUserRecord(userDoc)
    } catch (error: any) {
      console.error('Lookup failed:', error)
      setLookupError('Lookup failed. Check permissions or try again.')
    } finally {
      setLookupLoading(false)
    }
  }

  const handleSendTest = async () => {
    setTestResult(null)

    const payload: Record<string, any> = {
      title: testTitle.trim(),
      body: testBody.trim()
    }

    if (testApnsTopic.trim()) {
      payload.apnsTopic = testApnsTopic.trim()
    }

    if (testTokenOverride.trim()) {
      payload.token = testTokenOverride.trim()
    } else if (userRecord?.id) {
      payload.userId = userRecord.id
    }

    if (!payload.token && !payload.userId) {
      setTestResult('Provide a token override or select a user first.')
      return
    }

    setTestSending(true)
    try {
      const call = httpsCallable(functions, 'sendTestPush')
      const result = await call(payload)
      const data = result.data as { success?: boolean; messageId?: string; fallbackUsed?: boolean }
      setTestResult(
        data?.success
          ? `✅ Sent. Message ID: ${data.messageId || 'unknown'}${data.fallbackUsed ? ' (APNs fallback)' : ''}`
          : '✅ Sent.'
      )
      await loadLogs()
    } catch (error: any) {
      console.error('Failed to send test push:', error)
      const details = error?.message || 'Failed to send test push'
      setTestResult(`❌ ${details}`)
    } finally {
      setTestSending(false)
    }
  }

  const preferenceEntries = Object.entries(userRecord?.notificationPreferences || {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notification Debug</h1>
        <p className="text-gray-600 mt-2">Inspect tokens, preferences, and validate push delivery.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Lookup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={lookupValue}
              onChange={(event) => setLookupValue(event.target.value)}
              placeholder="Enter user UID or email"
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={handleLookup}
              disabled={lookupLoading}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-60"
            >
              {lookupLoading ? 'Searching…' : 'Lookup'}
            </button>
          </div>
          {lookupError && <p className="text-sm text-red-600">{lookupError}</p>}

          {userRecord && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-lg bg-gray-50 border">
                <p className="text-xs text-gray-500">User</p>
                <p className="font-semibold text-gray-900">{userRecord.email || userRecord.id}</p>
                <p className="text-xs text-gray-500 mt-1">UID: {userRecord.id}</p>
                {userRecord.role && <p className="text-xs text-gray-500 mt-1">Role: {userRecord.role}</p>}
                {userRecord.courierProfile?.status && (
                  <p className="text-xs text-gray-500 mt-1">Courier Status: {userRecord.courierProfile.status}</p>
                )}
              </div>
              <div className="p-4 rounded-lg bg-gray-50 border">
                <p className="text-xs text-gray-500">Tokens</p>
                <p className="text-xs mt-1">Courier token: {maskToken(userRecord.courierProfile?.fcmToken)}</p>
                <p className="text-xs mt-1">User token: {maskToken(userRecord.fcmToken)}</p>
                <p className="text-xs mt-2 font-semibold">Effective: {maskToken(effectiveToken)}</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 border md:col-span-2">
                <p className="text-xs text-gray-500">Notification Preferences</p>
                {preferenceEntries.length === 0 ? (
                  <p className="text-xs text-gray-700 mt-1">No explicit preferences set (defaults apply).</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {preferenceEntries.map(([key, value]) => (
                      <span
                        key={key}
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          value ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {key}: {value ? 'on' : 'off'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send Test Push</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
              <input
                type="text"
                value={testTitle}
                onChange={(event) => setTestTitle(event.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Body</label>
              <input
                type="text"
                value={testBody}
                onChange={(event) => setTestBody(event.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">APNs Topic (optional)</label>
              <input
                type="text"
                value={testApnsTopic}
                onChange={(event) => setTestApnsTopic(event.target.value)}
                placeholder="com.gosenderr.courier"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Token Override (optional)</label>
              <input
                type="text"
                value={testTokenOverride}
                onChange={(event) => setTestTokenOverride(event.target.value)}
                placeholder={effectiveToken || 'Paste a token'}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSendTest}
              disabled={testSending}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60"
            >
              {testSending ? 'Sending…' : 'Send Test Push'}
            </button>
            {testResult && <p className="text-sm text-gray-700">{testResult}</p>}
          </div>
          <p className="text-xs text-gray-500">
            Uses the sendTestPush callable and respects admin permissions. If no token override is provided, the selected
            user ID is used.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Test Push Logs</CardTitle>
            <button
              onClick={loadLogs}
              disabled={logsLoading}
              className="text-xs text-purple-600 font-semibold hover:text-purple-700"
            >
              Refresh
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {logsError && <p className="text-sm text-red-600 mb-2">{logsError}</p>}
          {logsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-500">No recent test push activity.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg border bg-white">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {log.action === 'send_test_push' ? '✅ Sent' : '❌ Failed'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTimestamp(log.createdAt)} • Target: {log.targetUserId || maskToken(log.targetToken)}
                      </p>
                    </div>
                    {log.apnsTopic && (
                      <span className="text-xs text-gray-600">APNs: {log.apnsTopic}</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-700">
                    <p>Title: {log.title || '—'}</p>
                    <p>Body: {log.body || '—'}</p>
                  </div>
                  {log.error?.message && (
                    <p className="mt-2 text-xs text-red-600">Error: {log.error.message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
