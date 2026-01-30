import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

interface RunSystemSimulationRequest {
  intensity?: number // how many orders/jobs to simulate
  cleanup?: boolean
}

export async function runSystemSimulationHandler(data: RunSystemSimulationRequest, context: functions.https.CallableContext) {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Authentication required')

  // Admin only
  const callerDoc = await admin.firestore().doc(`users/${context.auth.uid}`).get()
  if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required')
  }

  // Safety: emulator only
  if (!process.env.FIRESTORE_EMULATOR_HOST && process.env.GCLOUD_PROJECT === 'gosenderr-6773f') {
    throw new functions.https.HttpsError('failed-precondition', 'System simulation disabled in production')
  }

  const { intensity = 1, cleanup = true } = data || {}

  const runLogRef = admin.firestore().collection('adminFlowLogs').doc()
  const getServerTimestamp = () => {
    const fv = (admin.firestore as any).FieldValue
    if (fv && typeof fv.serverTimestamp === 'function') return fv.serverTimestamp()
    const ts = (admin.firestore as any).Timestamp
    if (ts && typeof ts.fromDate === 'function') return ts.fromDate(new Date())
    return new Date()
  }

  const log = (msg: string, meta: any = {}) => runLogRef.collection('entries').add({ message: msg, meta, ts: getServerTimestamp() })

  await runLogRef.set({ adminId: context.auth.uid, startedAt: getServerTimestamp(), status: 'running' })

  const created: { users: string[]; items: string[]; jobs: string[] } = { users: [], items: [], jobs: [] }

  try {
    await log('Starting system simulation', { intensity, cleanup })

    // Create test users: buyer, seller, courier
    const buyer = await admin.auth().createUser({ email: `sim-buyer+${Date.now()}@example.com`, password: 'pass123' })
    await admin.firestore().doc(`users/${buyer.uid}`).set({ role: 'customer', email: buyer.email })
    created.users.push(buyer.uid)
    await log('Created buyer', { uid: buyer.uid, email: buyer.email })

    const seller = await admin.auth().createUser({ email: `sim-seller+${Date.now()}@example.com`, password: 'pass123' })
    await admin.firestore().doc(`users/${seller.uid}`).set({ role: 'vendor', email: seller.email })
    created.users.push(seller.uid)
    await log('Created seller', { uid: seller.uid })

    const courier = await admin.auth().createUser({ email: `sim-courier+${Date.now()}@example.com`, password: 'pass123' })
    await admin.firestore().doc(`users/${courier.uid}`).set({ role: 'courier', courierProfile: { status: 'active' }, email: courier.email })
    created.users.push(courier.uid)
    await log('Created courier', { uid: courier.uid })

    // Create marketplace items by seller
    for (let i = 0; i < intensity; i++) {
      const item = { title: `Sim Item ${i}`, price: 10 + i, vendorId: seller.uid, createdAt: getServerTimestamp() }
      const itemRef = await admin.firestore().collection('marketplaceItems').add(item)
      created.items.push(itemRef.id)
      await log('Created marketplace item', { itemId: itemRef.id })
    }

    // Create delivery jobs or marketplace orders simulated
    for (let i = 0; i < intensity; i++) {
      // Create a canonical job document in the `jobs` collection with pickup/dropoff
      const job = {
        customerId: buyer.uid,
        sellerId: seller.uid,
        status: 'open',
        jobType: 'package',
        pickup: { label: '13611 Legacy Circle', address: '13611 Legacy Circle, Herndon, Virginia 20171, United States', lat: 38.949002, lng: -77.418122 },
        dropoff: { label: '1520 Constellation Place', address: '1520 Constellation Place, Woodbridge, Virginia 22191, United States', lat: 38.6213, lng: -77.2495 },
        agreedFee: null,
        createdAt: getServerTimestamp(),
        testRecord: true,
        createdByAdmin: true,
      }

      const jobRef = await admin.firestore().collection('jobs').add(job)
      created.jobs.push(jobRef.id)
      await log('Created delivery job', { jobId: jobRef.id })

      // Simulate courier claiming the job by setting courierUid and agreedFee
      // For local testing we set a sensible agreedFee so downstream logic (navigation, UI) can run
      await jobRef.update({ courierUid: courier.uid, agreedFee: 28, status: 'assigned', updatedAt: getServerTimestamp() })
      await log('Courier claimed job', { jobId: jobRef.id, courierUid: courier.uid, agreedFee: 28 })

      // Simulate job progress and completion using canonical status names
      await jobRef.update({ status: 'in_progress', updatedAt: getServerTimestamp() })
      await log('Job in progress', { jobId: jobRef.id })

      await jobRef.update({ status: 'completed', updatedAt: getServerTimestamp() })
      await log('Job completed', { jobId: jobRef.id })

      // Simulate payment record (simple doc)
      const payment = { customerId: buyer.uid, sellerId: seller.uid, amount: 10 + i, status: 'paid', createdAt: getServerTimestamp() }
      const payRef = await admin.firestore().collection('payments').add(payment)
      await log('Payment recorded', { paymentId: payRef.id })
    }

    await runLogRef.update({ status: 'complete', finishedAt: getServerTimestamp() })
    await log('System simulation completed', { created })

    // Cleanup if requested
    if (cleanup) {
      await log('Cleanup requested: removing created artifacts')
      // delete jobs
      for (const j of created.jobs) {
        try { await admin.firestore().doc(`deliveryJobs/${j}`).delete() } catch (e) {}
      }
      // delete items
      for (const it of created.items) {
        try { await admin.firestore().doc(`marketplaceItems/${it}`).delete() } catch (e) {}
      }
      // delete users
      for (const u of created.users) {
        try { await admin.auth().deleteUser(u) } catch (e) {}
        try { await admin.firestore().doc(`users/${u}`).delete() } catch (e) {}
      }
      await log('Cleanup finished')
    }

    return { success: true, runLogId: runLogRef.id, created }
  } catch (error: any) {
    await runLogRef.update({ status: 'failed', error: error.message || String(error), finishedAt: getServerTimestamp() })
    await log('System simulation failed', { error: error.message })
    functions.logger.error('runSystemSimulation error', error)
    throw error
  }
}

export const runSystemSimulation = functions.https.onCall(runSystemSimulationHandler)
