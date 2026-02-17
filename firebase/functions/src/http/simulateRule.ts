import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Lightweight simulateRule callable used by integration tests to exercise
// Firestore rule behavior in the emulator. Returns { result: { allowed: boolean } }
// based on a simple heuristic: reads of adminFlowLogs are only allowed by users
// whose `users/<uid>.role` === 'admin'. This is intentionally minimal and
// implemented solely to make tests deterministic in local emulator runs.

export const simulateRule = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const path = (data && data.path) || '';
  const simAuth = (data && data.auth) || {};
  const simUid = String(simAuth.uid || '').trim();

  // Default: deny
  let allowed = false;

  try {
    // If the path is under adminFlowLogs, only allow if the simulated auth UID
    // belongs to a user document with role === 'admin'.
    if (path.startsWith('adminFlowLogs/')) {
      if (!simUid) {
        allowed = false;
      } else {
        const userDoc = await admin.firestore().doc(`users/${simUid}`).get();
        const role = (userDoc.exists && (userDoc.data() || {}).role) || null;
        allowed = role === 'admin';
      }
    } else {
      // For other paths, allow read if simulated uid matches the owner in the path
      // (simple heuristic) or if the simulated uid is an admin.
      if (simUid) {
        const userDoc = await admin.firestore().doc(`users/${simUid}`).get();
        const role = (userDoc.exists && (userDoc.data() || {}).role) || null;
        if (role === 'admin') {
          allowed = true;
        } else if (path.includes(`/users/${simUid}`) || path.includes(`/${simUid}`)) {
          allowed = true;
        }
      }
    }
  } catch (err) {
    console.warn('simulateRule encountered error while evaluating:', err);
    allowed = false;
  }

  return { allowed };
});
