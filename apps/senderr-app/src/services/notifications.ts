import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'

export async function registerWebFcmToken(uid: string) {
  try {
    const messaging = getMessaging()
    const token = await getToken(messaging, { vapidKey: process.env.VITE_FIREBASE_VAPID_KEY })
    if (token) {
      await updateDoc(doc(db, 'users', uid), { fcmToken: token })
      return token
    }
  } catch (err) {
    console.error('registerWebFcmToken error', err)
    return null
  }
}

export function useForegroundNotificationHandler(callback: (payload: any) => void) {
  const messaging = getMessaging()
  onMessage(messaging, (payload) => {
    callback(payload)
  })
}

export default { registerWebFcmToken, useForegroundNotificationHandler }
