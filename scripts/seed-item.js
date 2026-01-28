// Use global fetch in Node 18+
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function main() {
  // Sign up test vendor to get uid
  const email = 'vender@sender.com';
  const password = 'admin123';
  const apiKey = 'fake-api-key';
  // Try signing in first (user may already exist)
  const signInUrl = `http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  let res = await fetch(signInUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  if (!res.ok) {
    // Fallback to signUp
    const signUpUrl = `http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
    res = await fetch(signUpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
  }

  if (!res.ok) throw new Error('Failed to sign in/up test user: ' + res.status);
  const json = await res.json();
  const uid = json.localId;
  console.log('Test vendor uid:', uid);

  // Init admin and write item doc
  initializeApp({ projectId: process.env.GCP_PROJECT || 'gosenderr-6773f' });
  const db = getFirestore();

  const item = {
    title: `E2E Seeded Item`,
    description: 'Seeded by automation script',
    price: 1.99,
    images: [],
    photos: [],
    category: 'other',
    condition: 'new',
    status: 'available',
    vendorId: uid,
    vendorName: 'Seed Vendor',
    sellerId: uid,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const docRef = await db.collection('items').add(item);
  console.log('Seeded item doc:', docRef.id);
}

main().catch(err => { console.error(err); process.exit(1); });