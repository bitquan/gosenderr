const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.SENDERR_FIREBASE_PROJECT_ID || 'gosenderr-6773f';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || process.env.SENDERR_FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const courierUid = process.env.COURIER_UID ? String(process.env.COURIER_UID).trim() : '';
const watchByCourier = courierUid.length > 0;

if (!admin.apps.length) {
  admin.initializeApp({projectId});
}

const db = admin.firestore();
db.settings({host: firestoreHost, ssl: false});

const toIso = value => {
  if (!value) return 'n/a';
  if (typeof value === 'string') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value._seconds === 'number') {
    const ms = value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6);
    return new Date(ms).toISOString();
  }
  return String(value);
};

const nowIso = () => new Date().toISOString();

const buildQuery = () => {
  const jobsRef = db.collection('jobs');
  if (watchByCourier) {
    return jobsRef.where('courierUid', '==', courierUid);
  }
  return jobsRef;
};

console.log(`🔭 Live jobs watcher started @ ${nowIso()}`);
console.log(`🧭 Project: ${projectId}`);
console.log(`🧪 Firestore emulator: ${firestoreHost}`);
console.log(watchByCourier ? `👤 Filter: courierUid == ${courierUid}` : '👤 Filter: none (all jobs)');
console.log('---');

let initialized = false;
const query = buildQuery();

const unsubscribe = query.onSnapshot(
  snapshot => {
    if (!initialized) {
      initialized = true;
      console.log(`📦 Initial snapshot docs: ${snapshot.size} @ ${nowIso()}`);
      return;
    }

    const changes = snapshot.docChanges();
    if (changes.length === 0) {
      console.log(`ℹ️ Snapshot ping (no changes) @ ${nowIso()}`);
      return;
    }

    console.log(`⚡ ${changes.length} change(s) @ ${nowIso()}`);
    for (const change of changes) {
      const data = change.doc.data() || {};
      const status = data.status || 'n/a';
      const updatedAt = toIso(data.updatedAt);
      const assignedCourier = data.courierUid || data.courierId || 'none';
      console.log(
        `  - ${change.type.toUpperCase()} ${change.doc.id} | status=${status} | updatedAt=${updatedAt} | courier=${assignedCourier}`,
      );
    }
  },
  error => {
    console.error(`❌ Watch stream error @ ${nowIso()}:`, error?.message || error);
  },
);

const shutdown = signal => {
  console.log(`\n🛑 Stopping watcher (${signal}) @ ${nowIso()}`);
  unsubscribe();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
