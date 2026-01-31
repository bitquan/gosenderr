#!/usr/bin/env node
/*
  verify-seller-update.js
  Quick verification that a user with sellerId can update their own marketplace item
  via the Firestore emulator REST API (which enforces security rules when using idToken).
*/

// node v18+ has global fetch; ensure it's available
if (typeof fetch === 'undefined') {
  throw new Error('Global fetch not available in this Node runtime');
}

(async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'gosenderr-6773f';
  const apiKey = process.env.FIREBASE_API_KEY || 'fake-api-key';
  const authEmail = process.env.TEST_SELLER_EMAIL || process.env.TEST_VENDOR_EMAIL || 'seller@sender.com';
  const authPass = process.env.TEST_SELLER_PASS || process.env.TEST_VENDOR_PASS || 'admin123';

  const signInUrl = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  let authRes = await fetch(signInUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: authEmail, password: authPass, returnSecureToken: true })
  });

  if (!authRes.ok) {
    // Try to create the user
    console.log('Auth sign-in failed, attempting to sign up user');
    const signUpUrl = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
    const signupRes = await fetch(signUpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authEmail, password: authPass, returnSecureToken: true })
    });
    if (!signupRes.ok) {
      console.error('Failed to sign up test user:', await signupRes.text());
      process.exit(1);
    }
    authRes = signupRes;
  }

  const authJson = await authRes.json();
  const idToken = authJson.idToken;
  const localId = authJson.localId;
  console.log('Signed in as', localId);

  // Ensure a user doc exists with seller role or sellerProfile so isSeller() returns true in rules
  const userDocUrl = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/users/${localId}`;
  const getUserRes = await fetch(userDocUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${idToken}` } });
  if (!getUserRes.ok) {
    console.log('User document missing - creating user doc with role seller');
    const userFields = {
      email: { stringValue: authEmail },
      displayName: { stringValue: 'Test Seller' },
      role: { stringValue: 'seller' },
      createdAt: { timestampValue: new Date().toISOString() }
    };
    const createUserRes = await fetch(userDocUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify({ fields: userFields })
    });
    if (!createUserRes.ok) {
      console.error('Failed to create user doc:', createUserRes.status, await createUserRes.text());
      process.exit(1);
    }
    console.log('Created user doc');
  }

  // Create the marketplace item with sellerId as this user
  const createUrl = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/marketplaceItems`;
  const nowIso = new Date().toISOString();
  const fields = {
    title: { stringValue: `Verify Item ${Date.now()}` },
    sellerId: { stringValue: localId },
    sellerName: { stringValue: 'Seller' },
    status: { stringValue: 'active' },
    price: { doubleValue: 9.99 },
    photos: { arrayValue: { values: [] } },
    createdAt: { timestampValue: nowIso },
    updatedAt: { timestampValue: nowIso }
  };

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify({ fields })
  });
  if (!createRes.ok) {
    console.error('Failed to create doc as seller:', createRes.status, await createRes.text());
    process.exit(1);
  }
  const created = await createRes.json();
  const name = created.name; // projects/.../marketplaceItems/{id}
  const id = name.split('/').pop();
  console.log('Created item:', id);

  // Attempt to update the doc as the same seller (should be allowed by rules)
  const patchUrl = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/marketplaceItems/${id}`;
  const patchRes = await fetch(patchUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify({ fields: { title: { stringValue: 'Updated Title' }, updatedAt: { timestampValue: new Date().toISOString() } } })
  });

  if (patchRes.ok) {
    console.log('PATCH succeeded - seller update allowed by rules');
  } else {
    console.error('PATCH failed - seller update denied by rules:', patchRes.status, await patchRes.text());
    process.exit(1);
  }

  console.log('Verification complete');
  process.exit(0);
})();
