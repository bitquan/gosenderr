import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth'
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage'
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions'

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
let functionsInstance: Functions | undefined

if (isValidConfig) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    dbInstance = getFirestore(app)
    authInstance = getAuth(app)
    storageInstance = getStorage(app)
    functionsInstance = getFunctions(app)
    
    // Connect to Firebase Emulators in development
    if (import.meta.env.DEV) {
      try {
        connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080)
        connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true })
        connectStorageEmulator(storageInstance, '127.0.0.1', 9199)
        connectFunctionsEmulator(functionsInstance, '127.0.0.1', 5001)
        console.log('Connected to Firebase Emulators')
      } catch (emulatorError) {
        // Emulator already connected (ignore error on hot reload)
        console.log('Emulator connection already established')
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
