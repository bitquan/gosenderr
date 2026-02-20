import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore'
import { getAuth, Auth } from 'firebase/auth'
import { getStorage, FirebaseStorage } from 'firebase/storage'
import { getFunctions, Functions } from 'firebase/functions'

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT || ''
const isEmulatorMode =
  import.meta.env.DEV && (
    import.meta.env.VITE_ADMIN_DESKTOP_USE_EMULATORS === 'true' ||
    import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' ||
    Boolean(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST) ||
    Boolean(import.meta.env.VITE_FIRESTORE_EMULATOR_HOST)
  )

const emulatorApiKeyFallback = 'AIzaSyA-LOCAL-EMULATOR-KEY-0000000000000000'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (isEmulatorMode ? emulatorApiKeyFallback : ''),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : ''),
  projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

const isValidConfig =
  (firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('AIza')) ||
  Boolean(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST) ||
  Boolean(import.meta.env.VITE_FIRESTORE_EMULATOR_HOST) ||
  Boolean(firebaseConfig.projectId)

let app: FirebaseApp | undefined
let dbInstance: Firestore | undefined
let authInstance: Auth | undefined
let storageInstance: FirebaseStorage | undefined
let functionsInstance: Functions | undefined

const shouldUseEmulators = isEmulatorMode

if (isValidConfig) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    try {
      dbInstance = initializeFirestore(app, {
        localCache: persistentLocalCache()
      })
    } catch (error) {
      console.warn('Firestore persistence unavailable:', error)
      dbInstance = getFirestore(app)
    }
    authInstance = getAuth(app)
    storageInstance = getStorage(app)
    functionsInstance = getFunctions(app, 'us-central1')
    
    // Admin Desktop should use production by default.
    // Opt-in to emulators only when explicitly enabled.
    if (shouldUseEmulators) {
      try {
        const firestoreEmulator = (import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || '').trim()
        if (firestoreEmulator) {
          const [host, portStr] = firestoreEmulator.split(':')
          const { connectFirestoreEmulator } = await import('firebase/firestore')
          connectFirestoreEmulator(dbInstance, host, Number(portStr || 8080))
        }

        const authEmulator = (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || '').trim()
        if (authEmulator) {
          const { connectAuthEmulator } = await import('firebase/auth')
          connectAuthEmulator(authInstance, `http://${authEmulator}`, { disableWarnings: true })
        }

        const storageEmulator = (import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_HOST || '').trim()
        if (storageEmulator) {
          const [host, portStr] = storageEmulator.split(':')
          const { connectStorageEmulator } = await import('firebase/storage')
          connectStorageEmulator(storageInstance, host, Number(portStr || 9199))
        }

        const functionsEmulator = (import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST || '').trim()
        if (functionsEmulator) {
          const [host, portStr] = functionsEmulator.split(':')
          const { connectFunctionsEmulator } = await import('firebase/functions')
          connectFunctionsEmulator(functionsInstance, host, Number(portStr || 5001))
        }
        console.log('✅ Connected to Firebase Emulators (admin-desktop)')
      } catch (e) {
        console.log('⚠️ Emulators already connected or not available')
      }
    }
    
    console.log('Firebase initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Firebase:', error)
  }
} else {
  console.error('Firebase config is invalid or missing. Check your .env file')
}

export { app }
export const db = dbInstance as Firestore
export const auth = authInstance as Auth
export const storage = storageInstance as FirebaseStorage
export const functions = functionsInstance as Functions
export const isFirebaseReady = () => !!dbInstance
