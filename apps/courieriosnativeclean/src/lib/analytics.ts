import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, getAuthSafe, isFirebaseReady } from './firebase';

export interface CourierEventPayload {
  courierUid: string;
  event: string;
  jobId?: string | null;
  details?: Record<string, any> | null;
}

function isPermissionDeniedError(error: any): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code.includes('permission-denied') || message.includes('missing or insufficient permissions');
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
    if (isPermissionDeniedError(error)) return;
    console.warn('Failed to log courier event', error);
  }
}
