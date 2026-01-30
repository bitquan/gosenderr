#!/usr/bin/env node
/**
 * Check script used in local CI to assert there are no jobs in 'assigned'
 * status without a courierUid. Exits with non-zero if any are found.
 * Intended for emulator/local runs.
 */

const admin = require('firebase-admin')

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('FIRESTORE_EMULATOR_HOST not set — skipping check (intended for emulator)')
  process.exit(0)
}

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'gosenderr-6773f' })

async function run() {
  const db = admin.firestore()
  const q = db.collection('jobs').where('status', '==', 'assigned')
  const snapshot = await q.get()

  const problematic = []
  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (!data.courierUid) problematic.push({ id: doc.id, data })
  }

  if (problematic.length > 0) {
    console.error('Found jobs assigned without courierUid:')
    problematic.forEach(p => console.error(` - ${p.id}`))
    process.exit(2)
  }

  console.log('No assigned jobs without courierUid found.')
}

run().catch(err => {
  console.error('Check failed:', err)
  process.exit(1)
})
