import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'
import {
  getAuth,
  Auth,
  indexedDBLocalPersistence,
  initializeAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { getStorage, FirebaseStorage } from 'firebase/storage'
import { getFunctions, Functions } from 'firebase/functions'
import { Capacitor } from '@capacitor/core'
import { isLiveWebRuntime } from './runtimeEnv'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

const hasUnsafeLiveFirebaseConfig =
  isLiveWebRuntime() &&
  (!firebaseConfig.projectId ||
    !firebaseConfig.authDomain ||
    /localhost|127\.0\.0\.1|::1/i.test(firebaseConfig.authDomain))

if (hasUnsafeLiveFirebaseConfig) {
  console.error('Unsafe live Firebase configuration detected; initialization is blocked.', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
  })
}

const isValidConfig =
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey.startsWith('AIza') &&
  !hasUnsafeLiveFirebaseConfig

let app: FirebaseApp | undefined
let dbInstance: Firestore | undefined
let authInstance: Auth | undefined
let storageInstance: FirebaseStorage | undefined
let functionsInstance: Functions | undefined

if (isValidConfig) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    dbInstance = getFirestore(app)
    
    // Initialize auth with proper persistence for Capacitor
    if (Capacitor.isNativePlatform()) {
      console.log('🔐 Initializing auth for native platform with indexedDB persistence');
      authInstance = initializeAuth(app, {
        persistence: indexedDBLocalPersistence
      });
    } else {
      console.log('🔐 Initializing auth for web platform');
      authInstance = getAuth(app);
    }
    
    storageInstance = getStorage(app)
    functionsInstance = getFunctions(app)
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
