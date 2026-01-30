#!/usr/bin/env node
/**
 * Repair script for emulator: find jobs with status 'assigned' but missing courierUid
 * and revert them to 'open' so local flows are consistent.
 *
 * WARNING: Intended for local emulator use only. This script checks for the
 * FIRESTORE_EMULATOR_HOST env var and refuses to run against production.
 */

const admin = require('firebase-admin')

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('This script should only be run against the Firestore emulator. Set FIRESTORE_EMULATOR_HOST and try again.')
  process.exit(1)
}

// Initialize admin app for emulator
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'gosenderr-6773f' })

async function run() {
  const db = admin.firestore()

  console.log('Scanning for jobs with status=="assigned" and missing courierUid...')
  const q = db.collection('jobs').where('status', '==', 'assigned')
  const snapshot = await q.get()

  if (snapshot.empty) {
    console.log('No assigned jobs found.')
    return
  }

  let found = 0
  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (!data.courierUid) {
      found++
      console.log(`Fixing job ${doc.id} — clearing assigned state -> open`)
      await doc.ref.update({ status: 'open', courierUid: null, agreedFee: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
    }
  }

  if (found === 0) {
    console.log('No jobs required fixing.')
  } else {
    console.log(`Fixed ${found} job(s).`) 
  }
}

run().catch(err => {
  console.error('Repair failed:', err)
  process.exit(1)
})
