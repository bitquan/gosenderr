import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getAuth, Auth } from 'firebase/auth'
import { getStorage, FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

const isValidConfig = firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('AIza')

let app: FirebaseApp | undefined
let dbInstance: Firestore | undefined
let authInstance: Auth | undefined
let storageInstance: FirebaseStorage | undefined

if (isValidConfig) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    dbInstance = getFirestore(app)
    authInstance = getAuth(app)
    storageInstance = getStorage(app)
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
export const isFirebaseReady = () => !!dbInstance
