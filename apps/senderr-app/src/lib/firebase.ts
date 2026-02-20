import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore'
import {
  getAuth,
  Auth,
  indexedDBLocalPersistence,
  initializeAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage'
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions'
import { Capacitor } from '@capacitor/core'

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT || ''
const isEmulatorMode =
  import.meta.env.DEV && (
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
    dbInstance = getFirestore(app)
    
    // Initialize auth with proper persistence for Capacitor
    if (Capacitor.isNativePlatform()) {
      console.log('🔐 Initializing auth for native platform with indexedDB persistence');
      try {
        authInstance = initializeAuth(app, {
          persistence: indexedDBLocalPersistence
        });
      } catch {
        authInstance = getAuth(app);
      }
    } else {
      console.log('🔐 Initializing auth for web platform');
      authInstance = getAuth(app);
    }
    
    storageInstance = getStorage(app)
    functionsInstance = getFunctions(app, 'us-central1')

    if (shouldUseEmulators) {
      try {
        const firestoreEmulator = (import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || '').trim()
        if (firestoreEmulator) {
          const [host, portStr] = firestoreEmulator.split(':')
          connectFirestoreEmulator(dbInstance, host, Number(portStr || 8080))
        }

        const authEmulator = (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || '').trim()
        if (authEmulator) {
          connectAuthEmulator(authInstance, `http://${authEmulator}`, { disableWarnings: true })
        }

        const storageEmulator = (import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_HOST || '').trim()
        if (storageEmulator) {
          const [host, portStr] = storageEmulator.split(':')
          connectStorageEmulator(storageInstance, host, Number(portStr || 9199))
        }

        const functionsEmulator = (import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST || '').trim()
        if (functionsEmulator) {
          const [host, portStr] = functionsEmulator.split(':')
          connectFunctionsEmulator(functionsInstance, host, Number(portStr || 5001))
        }
        console.log('Connected to Firebase Emulators')
      } catch (e) {
        console.log('Emulators already connected or not available')
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

export const getAuthSafe = () => authInstance ?? null

export async function signInWithEmail(email: string, password: string) {
  if (!authInstance) throw new Error('Firebase Auth not initialized')
  return signInWithEmailAndPassword(authInstance, email, password)
}

export async function signUpWithEmail(email: string, password: string) {
  if (!authInstance) throw new Error('Firebase Auth not initialized')
  return createUserWithEmailAndPassword(authInstance, email, password)
}

export async function signOut() {
  if (!authInstance) throw new Error('Firebase Auth not initialized')
  return firebaseSignOut(authInstance)
}
