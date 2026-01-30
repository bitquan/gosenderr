import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

interface DiagnoseRequest {}
interface DiagnoseResult {
  auth?: any
  callerDocExists?: boolean
  callerDocData?: any
  env?: any
}

export const diagnoseCreateUserCall = functions.https.onCall(async (data: DiagnoseRequest, context) => {
  // Safety: only allow on emulator or non-prod
  if (!process.env.FIRESTORE_EMULATOR_HOST && process.env.GCLOUD_PROJECT === 'gosenderr-6773f') {
    throw new functions.https.HttpsError('failed-precondition', 'This diagnostic is disabled in production')
  }

  try {
    const auth = context.auth || null
    let callerDocExists = false
    let callerDocData = null
    if (auth && auth.uid) {
      const ref = admin.firestore().doc(`users/${auth.uid}`)
      const snap = await ref.get()
      callerDocExists = snap.exists
      callerDocData = snap.exists ? snap.data() : null
    }

    const result: DiagnoseResult = {
      auth,
      callerDocExists,
      callerDocData,
      env: {
        FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || null,
        GCLOUD_PROJECT: process.env.GCLOUD_PROJECT || null,
      },
    }

    functions.logger.info('diagnoseCreateUserCall result', result)
    return result
  } catch (error: any) {
    functions.logger.error('diagnoseCreateUserCall error', error)
    throw new functions.https.HttpsError('internal', error.message || 'Diagnostic failed')
  }
})
