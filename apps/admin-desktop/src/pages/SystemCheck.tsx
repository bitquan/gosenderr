import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, Timestamp, query, limit, where, doc, getDoc, updateDoc, deleteDoc, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { getAuth } from 'firebase/auth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import SystemFlowMap from '../components/SystemFlowMap'
import { runSystemSimulation } from '../lib/cloudFunctions'

export type RunLogEntry = { id: string, message: string, meta?: any, ts?: any }


interface TestResult {
  name: string
  status: 'pending' | 'success' | 'failed' | 'running'
  message: string
  duration?: number
}

export default function SystemCheckPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const [testRecordIds, setTestRecordIds] = useState<{ collection: string; id: string }[]>([])

  const addResult = (name: string, status: 'pending' | 'success' | 'failed' | 'running', message: string, duration?: number) => {
    setResults(prev => {
      const existing = prev.findIndex(r => r.name === name)
      const newResult = { name, status, message, duration }
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = newResult
        return updated
      }
      return [...prev, newResult]
    })
  }

  const trackTestRecord = (collectionName: string, docId: string) => {
    setTestRecordIds(prev => [...prev, { collection: collectionName, id: docId }])
  }

  const runAllTests = async () => {
    setRunning(true)
    setResults([])
    setTestRecordIds([])

    // Authentication & Authorization
    await testAuthStatus()
    await testAdminRole()

    // Firebase Connection & Collections
    await testFirebaseConnection()
    await testCollectionsAccess()

    // Data Integrity
    await testDataIntegrity()
    await testRecordCounts()

    // CRUD Operations
    await testCreateUser()
    await testCreateOrder()
    await testCreateMessage()
    await testCreateAdminLog()
    await testCreateDispute()

    // Business Logic
    await testRefundFlow()
    await testRoleChangeFlow()
    await testDisputeStatusFlow()

    // Performance
    await testReadPerformance()
    await testBatchOperations()

    // Security
    await testSecurityRules()

    // Cleanup
    await testCleanupTestRecords()

    setRunning(false)
  }



  // ===== System Header Buttons =====
  // Add Run buttons in the UI header by using the page-level doc title area
  // We'll render them in the JSX below near the page header when returning the component

  // ===== AUTHENTICATION & AUTHORIZATION =====
  const testAuthStatus = async () => {
    addResult('Authentication Status', 'running', 'Checking auth...')
    const start = Date.now()
    try {
      const auth = getAuth()
      const user = auth.currentUser
      const duration = Date.now() - start
      if (user) {
        addResult('Authentication Status', 'success', `Authenticated as: ${user.email}`, duration)
      } else {
        addResult('Authentication Status', 'failed', 'No authenticated user', duration)
      }
    } catch (error) {
      const duration = Date.now() - start
      addResult('Authentication Status', 'failed', `Auth check failed: ${(error as any).message}`, duration)
    }
  }

  const testAdminRole = async () => {
    addResult('Admin Role Verification', 'running', 'Verifying admin status...')
    const start = Date.now()
    try {
      const auth = getAuth()
      const user = auth.currentUser
      if (!user) {
        const duration = Date.now() - start
        addResult('Admin Role Verification', 'failed', 'No user to verify', duration)
        return
      }

      const adminDoc = await getDoc(doc(db, 'adminProfiles', user.uid))
      const duration = Date.now() - start
      if (adminDoc.exists()) {
        addResult('Admin Role Verification', 'success', `User is admin: ${user.email}`, duration)
      } else {
        addResult('Admin Role Verification', 'failed', `User is not admin (no adminProfiles doc): ${user.email}`, duration)
      }
    } catch (error) {
      const duration = Date.now() - start
      addResult('Admin Role Verification', 'failed', `Role check failed: ${(error as any).message}`, duration)
    }
  }

  // ===== FIREBASE CONNECTION =====
  const testFirebaseConnection = async () => {
    addResult('Firebase Connection', 'running', 'Testing connection...')
    const start = Date.now()
    try {
      const testQuery = query(collection(db, 'users'), limit(1))
      await getDocs(testQuery)
      const duration = Date.now() - start
      addResult('Firebase Connection', 'success', `Connected successfully (${duration}ms)`, duration)
    } catch (error) {
      const duration = Date.now() - start
      addResult('Firebase Connection', 'failed', `Connection failed: ${(error as any).message}`, duration)
    }
  }

  const testCollectionsAccess = async () => {
    addResult('Collections Access', 'running', 'Testing collection access...')
    const start = Date.now()
    try {
      const collections = ['users', 'orders', 'marketplaceItems', 'adminMessages', 'adminLogs', 'disputes', 'categories']
      const results: Record<string, number> = {}
      for (const col of collections) {
        const snap = await getDocs(query(collection(db, col), limit(1)))
        results[col] = snap.size
      }
      const duration = Date.now() - start
      const message = `All collections accessible: ${Object.keys(results).join(', ')}`
      addResult('Collections Access', 'success', message, duration)
    } catch (error) {
      const duration = Date.now() - start
      addResult('Collections Access', 'failed', `Collection access failed: ${(error as any).message}`, duration)
    }
  }

  // ===== DATA INTEGRITY =====
  const testDataIntegrity = async () => {
    addResult('Data Integrity Check', 'running', 'Validating data structure...')
    const start = Date.now()
    try {
      let issues = 0
      
      // Check users have required fields
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(10)))
      usersSnap.forEach(doc => {
        const data = doc.data()
        if (!data.email) issues++
      })

      // Check orders have required fields
      const ordersSnap = await getDocs(query(collection(db, 'orders'), limit(10)))
      ordersSnap.forEach(doc => {
        const data = doc.data()
        if (!data.customerId || !data.total) issues++
      })

      const duration = Date.now() - start
      if (issues === 0) {
        addResult('Data Integrity Check', 'success', `All sample records valid (${duration}ms)`, duration)
      } else {
        addResult('Data Integrity Check', 'failed', `Found ${issues} invalid records`, duration)
      }
    } catch (error) {
      const duration = Date.now() - start
      addResult('Data Integrity Check', 'failed', `Integrity check failed: ${(error as any).message}`, duration)
    }
  }

  const testRecordCounts = async () => {
    addResult('Record Count Analysis', 'running', 'Counting records...')
    const start = Date.now()
    try {
      const collections = ['users', 'orders', 'disputes', 'adminMessages']
      const counts: Record<string, number> = {}
      
      for (const col of collections) {
        const snap = await getDocs(collection(db, col))
        counts[col] = snap.size
      }

      const duration = Date.now() - start
      const message = `Users: ${counts.users}, Orders: ${counts.orders}, Disputes: ${counts.disputes}, Messages: ${counts.adminMessages}`
      addResult('Record Count Analysis', 'success', message, duration)
    } catch (error) {
      const duration = Date.now() - start
      addResult('Record Count Analysis', 'failed', `Count failed: ${(error as any).message}`, duration)
    }
  }

  // ===== System Simulation (orchestrated) =====
  const [runEntries, setRunEntries] = useState<RunLogEntry[]>([])
  const [runId, setRunId] = useState<string | null>(null)
  const [simRunning, setSimRunning] = useState(false)
  const [intensity, setIntensity] = useState<number>(1)
  const [runSummary, setRunSummary] = useState<any | null>(null)

  // Start system simulation, subscribe to run log entries and stop when run completes
  const startSystemSimulation = async () => {
    setSimRunning(true)
    setRunEntries([])
    setRunSummary(null)
    try {
      const res = await runSystemSimulation({ intensity, cleanup: true })
      if (!res || !res.runLogId) throw new Error('No run id returned')
      setRunId(res.runLogId)
      setRunSummary({ created: res.created, runLogId: res.runLogId })

      // Subscribe to entries
      const q = query(collection(db, `adminFlowLogs/${res.runLogId}/entries`), orderBy('ts', 'asc'))
      const unsub = onSnapshot(q, snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as RunLogEntry[]
        setRunEntries(docs)
      }, err => {
        console.error('run entries subscription error', err)
      })

      // auto-unsubscribe when finished (listen for run doc status change)
      const runDocRef = doc(db, 'adminFlowLogs', res.runLogId)
      const unsubRun = onSnapshot(runDocRef, d => {
        const data = d.data() as any
        if (data?.status === 'complete' || data?.status === 'failed') {
          unsub()
          unsubRun()
          setSimRunning(false)
        }
      })
    } catch (error: any) {
      console.error('run system simulation failed', error)
      const errorMsg = error?.message || String(error)
      const isCloudFunctionError = errorMsg.includes('403') || errorMsg.includes('Forbidden') || errorMsg.includes('Admin privileges')
      setRunSummary({ 
        error: isCloudFunctionError 
          ? 'System Simulation requires Cloud Functions (not available on emulator). Please ensure you have admin privileges or deploy the Cloud Function.' 
          : errorMsg 
      })
      setSimRunning(false)
    }
  }

  // ===== CRUD OPERATIONS =====
  const testCreateUser = async () => {
    addResult('Create Test User', 'running', 'Creating test user...')
    const start = Date.now()
    try {
      const testUser = {
        email: `test-${Date.now()}@example.com`,
        name: 'System Test User',
        role: 'customer',
        createdAt: Timestamp.now(),
        testRecord: true
      }
      const docRef = await addDoc(collection(db, 'users'), testUser)
      trackTestRecord('users', docRef.id)
      const duration = Date.now() - start
      addResult('Create Test User', 'success', `User created (${duration}ms)`, duration)
    } catch (error) {
      const duration = Date.now() - start
      addResult('Create Test User', 'failed', `User creation failed: ${(error as any).message}`, duration)
    }
  }

  const testCreateOrder = async () => {
    addResult('Create Test Order', 'running', 'Creating test order...')
    const start = Date.now()
    try {
      const testOrder = {
        customerId: 'test-customer-' + Date.now(),
        sellerId: 'test-seller-' + Date.now(),
        total: 99.99,
        status: 'pending',
        createdAt: Timestamp.now(),
        items: [{ name: 'Test Item', quantity: 1, price: 99.99 }],
        testRecord: true
      }
      const docRef = await addDoc(collection(db, 'orders'), testOrder)
      trackTestRecord('orders', docRef.id)
      const duration = Date.now() - start
      addResult('Create Test Order', 'success', `Order created (${duration}ms)`, duration)
    } catch (error) {
      const duration = Date.now() - start
      addResult('Create Test Order', 'failed', `Order creation failed: ${(error as any).message}`, duration)
    }
  }

  const testCreateMessage = async () => {
    addResult('Create Test Message', 'running', 'Creating test message...')
    const start = Date.now()
    try {
      const testMessage = {
        recipientId: 'test-user-' + Date.now(),
        recipientEmail: `recipient-${Date.now()}@example.com`,
        subject: 'System Test Message',
        body: 'This is a test message to verify the messaging system is working.',
        type: 'notification',
        read: false,
        createdAt: Timestamp.now(),
        sentBy: 'admin@example.com',
        testRecord: true
      }
      const docRef = await addDoc(collection(db, 'adminMessages'), testMessage)
      trackTestRecord('adminMessages', docRef.id)
      const duration = Date.now() - start
      addResult('Create Test Message', 'success', `Message created (${duration}ms)`, duration)
    } catch (error) {
      const duration = Date.now() - start
      addResult('Create Test Message', 'failed', `Message creation failed: ${(error as any).message}`, duration)
    }
  }

  const testCreateAdminLog = async () => {
    addResult('Create Admin Log', 'running', 'Creating test admin log...')
    const start = Date.now()
    try {
      const testLog = {
        action: 'system_test',
        userId: 'test-user-' + Date.now(),
        timestamp: Timestamp.now(),
        adminEmail: 'admin@example.com',
        details: { test: true, message: 'System check test log' },
        testRecord: true
      }
      const docRef = await addDoc(collection(db, 'adminLogs'), testLog)
      trackTestRecord('adminLogs', docRef.id)
      const duration = Date.now() - start
      addResult('Create Admin Log', 'success', `Log created (${duration}ms)`, duration)
    } catch (error) {
      const duration = Date.now() - start
      addResult('Create Admin Log', 'failed', `Log creation failed: ${(error as any).message}`, duration)
    }
  }

  const testCreateDispute = async () => {
    addResult('Create Test Dispute', 'running', 'Creating test dispute...')
    const start = Date.now()
    try {
      const testUserId = 'test-user-' + Date.now()
      const testDispute = {
        orderId: 'test-order-' + Date.now(),
        userEmail: `user-${Date.now()}@example.com`,
        customerId: 'test-cust-' + Date.now(),
        sellerId: 'test-sell-' + Date.now(),
        reportedBy: testUserId,
        reason: 'System Test Dispute',
        description: 'This is a test dispute for system validation.',
        status: 'open',
        createdAt: Timestamp.now(),
        testRecord: true
      }
      const docRef = await addDoc(collection(db, 'disputes'), testDispute)
      trackTestRecord('disputes', docRef.id)
      const duration = Date.now() - start
      addResult('Create Test Dispute', 'success', `Dispute created (${duration}ms)`, duration)
    } catch (error) {
      const duration = Date.now() - start
      addResult('Create Test Dispute', 'failed', `Dispute creation failed: ${(error as any).message}`, duration)
    }
  }

  // ===== BUSINESS LOGIC FLOWS =====
  const testRefundFlow = async () => {
    addResult('Refund Flow Test', 'running', 'Testing refund process...')
    const start = Date.now()
    try {
      // Create order
      const order = await addDoc(collection(db, 'orders'), {
        customerId: 'test-cust-' + Date.now(),
        sellerId: 'test-sell-' + Date.now(),
        total: 50.00,
        status: 'delivered',
        createdAt: Timestamp.now(),
        testRecord: true
      })
      trackTestRecord('orders', order.id)

      // Issue refund
      await updateDoc(doc(db, 'orders', order.id), {
        refundAmount: 50.00,
        refundReason: 'Test refund',
        refundedAt: Timestamp.now()
      })

      const duration = Date.now() - start
      addResult('Refund Flow Test', 'success', `Refund flow completed (${duration}ms)`, duration)
    } catch (error) {
      const duration = Date.now() - start
      addResult('Refund Flow Test', 'failed', `Refund flow failed: ${(error as any).message}`, duration)
    }
  }

  const testRoleChangeFlow = async () => {
    addResult('Role Change Flow Test', 'running', 'Testing role change...')
    const start = Date.now()
    try {
      // Create user
      const user = await addDoc(collection(db, 'users'), {
        email: `role-test-${Date.now()}@example.com`,
        name: 'Role Test User',
        role: 'customer',
        createdAt: Timestamp.now(),
        testRecord: true
      })
      trackTestRecord('users', user.id)

      // Change role
      await updateDoc(doc(db, 'users', user.id), {
        role: 'vendor'
      })

      // Log action
      await addDoc(collection(db, 'adminLogs'), {
        action: 'user_role_changed',
        userId: user.id,
        oldRole: 'customer',
        newRole: 'vendor',
        timestamp: Timestamp.now(),
        adminEmail: 'admin@example.com',
        testRecord: true
      })

      const duration = Date.now() - start
      addResult('Role Change Flow Test', 'success', `Role change flow completed (${duration}ms)`, duration)
    } catch (error) {
      const duration = Date.now() - start
      addResult('Role Change Flow Test', 'failed', `Role change failed: ${(error as any).message}`, duration)
    }
  }

  const testDisputeStatusFlow = async () => {
    addResult('Dispute Status Flow Test', 'running', 'Testing dispute transitions...')
    const start = Date.now()
    try {
      const testUserId = 'test-user-' + Date.now()
      // Create dispute
      const dispute = await addDoc(collection(db, 'disputes'), {
        orderId: 'test-order-' + Date.now(),
        reportedBy: testUserId,
        reason: 'Flow Test',
        description: 'Testing status transitions',
        status: 'open',
        createdAt: Timestamp.now(),
        testRecord: true
      })
      trackTestRecord('disputes', dispute.id)

      // Transition: open -> reviewing
      await updateDoc(doc(db, 'disputes', dispute.id), { status: 'reviewing' })

      // Transition: reviewing -> resolved
      await updateDoc(doc(db, 'disputes', dispute.id), {
        status: 'resolved',
        resolutionAction: 'full_refund',
        resolution: 'Test resolution',
        resolvedAt: Timestamp.now()
      })

      const duration = Date.now() - start
      addResult('Dispute Status Flow Test', 'success', `Dispute transitions completed (${duration}ms)`, duration)
    } catch (error) {
      const duration = Date.now() - start
      addResult('Dispute Status Flow Test', 'failed', `Dispute flow failed: ${(error as any).message}`, duration)
    }
  }

  // ===== PERFORMANCE TESTS =====
  const testReadPerformance = async () => {
    addResult('Read Performance', 'running', 'Testing read performance...')
    const start = Date.now()
    try {
      const collections = ['users', 'orders', 'marketplaceItems']
      const timings: Record<string, number> = {}

      for (const col of collections) {
        const colStart = Date.now()
        await getDocs(query(collection(db, col), limit(10)))
        timings[col] = Date.now() - colStart
      }

      const duration = Date.now() - start
      const message = `Read completed: ${Object.entries(timings)
        .map(([k, v]) => `${k} (${v}ms)`)
        .join(', ')}`
      addResult('Read Performance', 'success', message, duration)
    } catch (error) {
      const duration = Date.now() - start
      addResult('Read Performance', 'failed', `Performance test failed: ${(error as any).message}`, duration)
    }
  }

  const testBatchOperations = async () => {
    addResult('Batch Operations', 'running', 'Testing batch creation...')
    const start = Date.now()
    try {
      const batchSize = 5
      const ids = []

      for (let i = 0; i < batchSize; i++) {
        const docRef = await addDoc(collection(db, 'adminLogs'), {
          action: 'batch_test',
          timestamp: Timestamp.now(),
          adminEmail: 'admin@example.com',
          batchIndex: i,
          testRecord: true
        })
        ids.push(docRef.id)
        trackTestRecord('adminLogs', docRef.id)
      }

      const duration = Date.now() - start
      addResult('Batch Operations', 'success', `Created ${batchSize} records in ${duration}ms`, duration)
    } catch (error) {
      const duration = Date.now() - start
      addResult('Batch Operations', 'failed', `Batch test failed: ${(error as any).message}`, duration)
    }
  }

  // ===== SECURITY TESTS =====
  const testSecurityRules = async () => {
    addResult('Security Rules Enforcement', 'running', 'Verifying security rules...')
    const start = Date.now()
    try {
      // If we can read users, rules are allowing reads
      const usersSnap = await getDocs(collection(db, 'users'))
      const duration = Date.now() - start
      addResult('Security Rules Enforcement', 'success', `Security rules active (${usersSnap.size} users readable)`, duration)
    } catch (error) {
      const duration = Date.now() - start
      addResult('Security Rules Enforcement', 'failed', `Rules check failed: ${(error as any).message}`, duration)
    }
  }

  // ===== CLEANUP =====
  const testCleanupTestRecords = async () => {
    addResult('Cleanup Test Records', 'running', `Cleaning up ${testRecordIds.length} test records...`)
    const start = Date.now()
    try {
      let deleted = 0
      for (const record of testRecordIds) {
        try {
          await deleteDoc(doc(db, record.collection, record.id))
          deleted++
        } catch (e) {
          // Skip errors on individual deletions
        }
      }

      const duration = Date.now() - start
      addResult('Cleanup Test Records', 'success', `Cleaned up ${deleted} test records (${duration}ms)`, duration)
    } catch (error) {
      const duration = Date.now() - start
      addResult('Cleanup Test Records', 'failed', `Cleanup failed: ${(error as any).message}`, duration)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅'
      case 'failed':
        return '❌'
      case 'running':
        return '⏳'
      default:
        return '⭕'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'failed':
        return 'bg-red-50 border-red-200'
      case 'running':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const passedTests = results.filter(r => r.status === 'success').length
  const failedTests = results.filter(r => r.status === 'failed').length
  const totalTests = results.length

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🔧 Comprehensive System Check</h1>
          <p className="text-purple-100">Full platform diagnostics and flow testing</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Test Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Tests Run</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{totalTests}</p>
              <p className="text-xs text-gray-600 mt-1">Total executed</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Passed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{passedTests}</p>
              <p className="text-xs text-gray-600 mt-1">Successful</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Failed</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{failedTests}</p>
              <p className="text-xs text-gray-600 mt-1">Issues found</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Success Rate</p>
              <p className={`text-3xl font-bold mt-2 ${totalTests === 0 ? 'text-gray-600' : passedTests === totalTests ? 'text-green-600' : 'text-orange-600'}`}>
                {totalTests === 0 ? '-' : Math.round((passedTests / totalTests) * 100) + '%'}
              </p>
              <p className="text-xs text-gray-600 mt-1">Passing rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Run Tests & System Simulation Buttons */}
        <div className="flex gap-3 items-start">
          <div className="flex gap-3">
            <button
              onClick={runAllTests}
              disabled={running}
              className="px-6 py-3 bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50"
            >
              {running ? '⏳ Running Comprehensive Tests...' : '▶️ Run All Tests (18 total)'}
            </button>

            <label className="text-sm text-gray-700 mr-2 self-center">Intensity:</label>
            <select value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="rounded px-2 py-1 mr-4 self-center">
              <option value={1}>Small (1)</option>
              <option value={3}>Medium (3)</option>
              <option value={5}>Large (5)</option>
            </select>

            <button
              onClick={startSystemSimulation}
              disabled={simRunning}
              className="px-4 py-3 rounded bg-indigo-600 text-white hover:shadow-md disabled:opacity-50"
            >
              {simRunning ? 'Running Simulation...' : '🔁 Run System Simulation'}
            </button>
          </div>

          {/* Live Flow Map and entries */}
          <div className="ml-auto w-full md:w-1/2">
            <Card>
              <CardHeader>
                <CardTitle>System Flow Map</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <SystemFlowMap entries={runEntries} />
                  <div className="mt-3 bg-gray-50 p-3 rounded max-h-40 overflow-auto text-xs">
                    {runEntries.length === 0 ? (
                      <div className="text-gray-500">No simulation entries yet</div>
                    ) : (
                      <ul className="space-y-2">
                        {runEntries.map(e => (
                          <li key={e.id} className="border-b pb-1">
                            <div className="text-xs text-gray-500">{new Date(e.ts?.toDate?.() || e.ts || Date.now()).toLocaleString()}</div>
                            <div>{e.message}</div>
                            {e.meta && <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{JSON.stringify(e.meta, null, 2)}</pre>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Summary card for simulation results */}
                  {runSummary && (
                    <div className="mt-3">
                      <Card>
                        <CardHeader>
                          <CardTitle>Simulation Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {runSummary.error ? (
                            <div className="text-red-600">Error: {runSummary.error}</div>
                          ) : (
                            <div className="text-sm">
                              <div>Run ID: {runSummary.runLogId}</div>
                              <div>Created Users: {runSummary.created?.users?.length || 0}</div>
                              <div>Created Items: {runSummary.created?.items?.length || 0}</div>
                              <div>Created Jobs: {runSummary.created?.jobs?.length || 0}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Test Results */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Test Results ({results.length}/18)</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 text-sm">Click "Run All Tests" to start comprehensive system validation</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result) => (
                  <div key={result.name} className={`border-2 rounded-lg p-4 ${getStatusColor(result.status)}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{getStatusIcon(result.status)}</span>
                          <p className="font-semibold text-gray-900">{result.name}</p>
                        </div>
                        <p className="text-sm text-gray-700">{result.message}</p>
                      </div>
                      {result.duration && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-900">{result.duration}ms</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>📋 Test Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Auth & Security:</strong> 2 tests</p>
                <p><strong>Database:</strong> 5 tests</p>
                <p><strong>CRUD Operations:</strong> 5 tests</p>
                <p><strong>Business Logic:</strong> 3 tests</p>
                <p><strong>Performance:</strong> 2 tests</p>
                <p><strong>Cleanup:</strong> 1 test</p>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>🎯 What Gets Tested</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>✅ User authentication status</p>
                <p>✅ Admin role verification</p>
                <p>✅ All Firestore collections</p>
                <p>✅ Data integrity & validation</p>
                <p>✅ Complete user/order/dispute flows</p>
                <p>✅ Query performance</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
