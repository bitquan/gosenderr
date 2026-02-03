import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, getAuthSafe, isFirebaseReady } from './firebase';

export interface CourierEventPayload {
  courierUid: string;
  event: string;
  jobId?: string | null;
  details?: Record<string, any> | null;
}

export async function logCourierEvent(payload: CourierEventPayload) {
  if (!isFirebaseReady()) return;
  const auth = getAuthSafe();
  const uid = auth?.currentUser?.uid;
  if (!uid) return;
  try {
    await addDoc(collection(db, 'courierEvents'), {
      ...payload,
      courierUid: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Failed to log courier event', error);
  }
}
