import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

interface SimulateRuleRequest {
  op: 'get' | 'list' | 'set' | 'update' | 'delete'
  path: string
  payload?: any
  auth?: {
    uid?: string
    claims?: Record<string, any>
  }
}

function toFirestoreValue(val: any): any {
  if (val === null) return { nullValue: null }
  if (typeof val === 'string') return { stringValue: val }
  if (typeof val === 'number') return { doubleValue: val }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {}
    for (const k of Object.keys(val)) fields[k] = toFirestoreValue(val[k])
    return { mapValue: { fields } }
  }
  // fallback to string
  return { stringValue: String(val) }
}

async function exchangeCustomTokenForIdToken(customToken: string) {
  const url = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=any`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  })
  const json = await res.json()
  if (!json.idToken) throw new Error('Failed to exchange custom token: ' + JSON.stringify(json))
  return json.idToken
}

export const simulateRule = functions.https.onCall(async (data: SimulateRuleRequest, context) => {
  // Safety: only allow in emulator
  if (!process.env.FIRESTORE_EMULATOR_HOST && process.env.GCLOUD_PROJECT === 'gosenderr-6773f') {
    throw new functions.https.HttpsError('failed-precondition', 'This diagnostic is disabled in production')
  }

  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
  }

  // Only admins allowed to run the simulation
  const callerDoc = await admin.firestore().doc(`users/${context.auth.uid}`).get()
  const callerData = callerDoc.data()
  const callerRoles = Array.isArray(callerData?.roles) ? callerData?.roles : []
  const isAdmin = callerData?.role === 'admin' || callerRoles.includes('admin')
  if (!callerDoc.exists || !isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required')
  }

  const { op, path, payload, auth } = data || {}
  if (!op || !path) throw new functions.https.HttpsError('invalid-argument', 'op and path are required')

  try {
    let idToken: string | undefined
    if (auth && auth.uid) {
      const customToken = await admin.auth().createCustomToken(auth.uid, auth.claims || {})
      idToken = await exchangeCustomTokenForIdToken(customToken)
    }

    const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'gosenderr-6773f'
    const base = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents`

    const headers: any = {
      'Content-Type': 'application/json',
    }
    if (idToken) headers.Authorization = `Bearer ${idToken}`

    let url = ''
    let method = 'GET'
    let body: any = undefined

    switch (op) {
      case 'get':
        url = `${base}/${path}`
        method = 'GET'
        break
      case 'list':
        // list documents under collection
        url = `${base}/${path}`
        method = 'GET'
        break
      case 'delete':
        url = `${base}/${path}`
        method = 'DELETE'
        break
      case 'set':
        url = `${base}/${path}`
        method = 'PATCH'
        body = { fields: toFirestoreValue(payload).mapValue ? toFirestoreValue(payload).mapValue.fields : {} }
        break
      case 'update':
        url = `${base}/${path}`
        method = 'PATCH'
        body = { fields: toFirestoreValue(payload).mapValue ? toFirestoreValue(payload).mapValue.fields : {} }
        break
      default:
        throw new functions.https.HttpsError('invalid-argument', 'Unsupported op')
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const text = await res.text()
    let parsed: any = null
    try { parsed = text ? JSON.parse(text) : null } catch (e) { parsed = text }

    const result = {
      allowed: res.status >= 200 && res.status < 400,
      status: res.status,
      body: parsed,
    }

    functions.logger.info('simulateRule result', { op, path, auth, result })
    return result
  } catch (error: any) {
    functions.logger.error('simulateRule error', error)
    throw new functions.https.HttpsError('internal', error?.message || 'Simulation failed')
  }
})
