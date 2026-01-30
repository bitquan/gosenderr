import { writeFileSync } from 'fs'
import fetch from 'node-fetch'

// Playwright globalSetup must export default async function
export default async function globalSetup() {
  console.log('E2E globalSetup: seeding test data')

  const FIRESTORE_BASE = 'http://127.0.0.1:8080/v1/projects/gosenderr-6773f/databases/(default)/documents'
  const AUTH_SIGNUP = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key'

  // Create vendor user via Auth emulator and ensure Firestore user doc matches auth uid
  let vendorUid: string | null = null;
  try {
    const res = await fetch(AUTH_SIGNUP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vender@sender.com', password: 'admin123', returnSecureToken: true }),
    });

    if (res.ok) {
      const json = await res.json();
      vendorUid = json.localId;
      console.log('Auth signup succeeded, uid=', vendorUid);
    } else {
      // If sign up failed (user exists), try signIn to get localId
      const signInRes = await fetch(AUTH_SIGNUP.replace(':signUp', ':signInWithPassword'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'vender@sender.com', password: 'admin123', returnSecureToken: true }),
      });
      if (signInRes.ok) {
        const signInJson = await signInRes.json();
        vendorUid = signInJson.localId;
        console.log('Auth sign-in succeeded, uid=', vendorUid);
      } else {
        console.warn('Auth sign-in failed, status=', signInRes.status);
      }
    }
  } catch (e) {
    console.warn('Auth signup/signin returned error (maybe already exists):', e)
  }

  // Create vendor user doc (use vendorUid if available, else fall back to 'vendor')
  const vendorDocId = vendorUid || 'vendor';
  const vendorDocBody = {
    fields: {
      email: { stringValue: 'vender@sender.com' },
      role: { stringValue: 'vendor' },
      primaryRole: { stringValue: 'vendor' },
      roles: { arrayValue: { values: [{ stringValue: 'vendor' }] } },
      displayName: { stringValue: 'Test Vendor' },
      createdAt: { timestampValue: new Date().toISOString() }
    }
  };

  try {
    const resp = await fetch(`${FIRESTORE_BASE}/users/${vendorDocId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vendorDocBody),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.warn('Failed to write vendor user doc via REST:', resp.status, text);

      // If Firestore rules prevented the write, fall back to admin SDK (emulator) to seed the doc
      if (resp.status === 403) {
        console.log('Firestore REST write blocked by security rules; falling back to firebase-admin to seed vendor user doc:', vendorDocId);
        try {
          // Dynamically import firebase-admin so we don't add heavy deps to browser bundles
          const adminModule = await import('firebase-admin');
          const admin = adminModule.default || adminModule;

          // Ensure emulator env is set (admin SDK respects this)
          process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

          // Initialize only if not already initialized
          if (!admin.apps?.length) {
            admin.initializeApp({ projectId: 'gosenderr-6773f' });
          }

          const adminDb = admin.firestore();
          await adminDb.doc(`users/${vendorDocId}`).set({
            email: 'vender@sender.com',
            role: 'vendor',
            primaryRole: 'vendor',
            roles: ['vendor'],
            displayName: 'Test Vendor',
            createdAt: new Date().toISOString(),
          }, { merge: true });

          console.log('Wrote vendor user doc via firebase-admin fallback for', vendorDocId);
        } catch (e) {
          console.error('firebase-admin fallback failed for vendor doc:', vendorDocId, e);
          throw new Error(`E2E globalSetup: firebase-admin fallback failed for vendor doc ${vendorDocId}: ${e}`);
        }
      } else {
        throw new Error(`E2E globalSetup: Failed to write vendor user doc via REST (${resp.status}): ${text}`);
      }
    } else {
      console.log('Wrote vendor user doc at users/' + vendorDocId);
    }

    // Poll the document until it is readable (gives Firestore time to become consistent)
    const maxAttempts = 8;
    let gotDoc = false;
    for (let i = 0; i < maxAttempts; i++) {
      const check = await fetch(`${FIRESTORE_BASE}/users/${vendorDocId}`);
      if (check.ok) {
        gotDoc = true;
        console.log('Verified user doc exists for', vendorDocId);
        break;
      }
      // Wait and retry
      await new Promise((res) => setTimeout(res, 500 * (i + 1)));
    }

    if (!gotDoc) {
      throw new Error('E2E globalSetup: Timed out waiting for vendor user doc to be readable: ' + vendorDocId);
    }
  } catch (e) {
    console.warn('Failed to create vendor user doc:', e)
  }

  // Create sample item
  try {
    await fetch(`${FIRESTORE_BASE}/items/test-item-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { title: { stringValue: 'Test Item for E2E' }, description: { stringValue: 'Seeded test item' }, price: { doubleValue: 19.99 }, status: { stringValue: 'available' }, sellerId: { stringValue: 'vendor' }, vendorName: { stringValue: 'Test Vendor' }, createdAt: { timestampValue: new Date().toISOString() } } }),
    })
  } catch (e) {
    console.warn('Failed to create test item:', e)
  }

  // Create additional accounts: admin and courier for smoke tests
  const extraAccounts = [
    { email: 'admin@sender.com', password: 'admin123', role: 'admin' },
    { email: 'courier@sender.com', password: 'courier123', role: 'courier' },
  ];

  for (const acct of extraAccounts) {
    let acctUid: string | null = null;
    try {
      const res = await fetch(AUTH_SIGNUP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: acct.email, password: acct.password, returnSecureToken: true }),
      });

      if (res.ok) {
        const json = await res.json();
        acctUid = json.localId;
        console.log(`Auth signup succeeded for ${acct.email}, uid=`, acctUid);
      } else {
        const signInRes = await fetch(AUTH_SIGNUP.replace(':signUp', ':signInWithPassword'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: acct.email, password: acct.password, returnSecureToken: true }),
        });
        if (signInRes.ok) {
          const signInJson = await signInRes.json();
          acctUid = signInJson.localId;
          console.log(`Auth sign-in succeeded for ${acct.email}, uid=`, acctUid);
        }
      }
    } catch (e) {
      console.warn(`Auth signup/signin error for ${acct.email}:`, e);
    }

    const acctDocId = acctUid || acct.role;
    const acctDocBody = {
      fields: {
        email: { stringValue: acct.email },
        role: { stringValue: acct.role },
        primaryRole: { stringValue: acct.role },
        roles: { arrayValue: { values: [{ stringValue: acct.role }] } },
        displayName: { stringValue: `Test ${acct.role}` },
        createdAt: { timestampValue: new Date().toISOString() },
        ...(acct.role === 'courier' ? {
          courierProfile: {
            mapValue: {
              fields: {
                packageRateCard: {
                  mapValue: {
                    fields: {
                      baseFare: { doubleValue: 3.0 },
                      perMile: { doubleValue: 0.5 },
                      perMinute: { doubleValue: 0.1 },
                      optionalFees: { arrayValue: { values: [] } }
                    }
                  }
                },
                foodRateCard: {
                  mapValue: {
                    fields: {
                      baseFare: { doubleValue: 2.5 },
                      perMile: { doubleValue: 0.75 },
                      restaurantWaitPay: { doubleValue: 0.15 },
                      optionalFees: { arrayValue: { values: [] } }
                    }
                  }
                },
                currentLocation: {
                  mapValue: {
                    fields: {
                      lat: { doubleValue: 37.7749 },
                      lng: { doubleValue: -122.4194 }
                    }
                  }
                }
              }
            }
          }
        } : {})
      }
    };

    try {
      const resp = await fetch(`${FIRESTORE_BASE}/users/${acctDocId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(acctDocBody),
      });
      if (!resp.ok) {
        const text = await resp.text();
        console.warn(`Failed to write ${acct.role} user doc via REST:`, resp.status, text);

        // If Firestore security rules prevented the write, use firebase-admin fallback to seed
        if (resp.status === 403) {
          try {
            const adminModule = await import('firebase-admin');
            const admin = adminModule.default || adminModule;
            process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
            if (!admin.apps?.length) {
              admin.initializeApp({ projectId: 'gosenderr-6773f' });
            }
            const adminDb = admin.firestore();
            await adminDb.doc(`users/${acctDocId}`).set({
              email: acct.email,
              role: acct.role,
              primaryRole: acct.role,
              roles: [acct.role],
              displayName: `Test ${acct.role}`,
              createdAt: new Date().toISOString(),
              ...(acct.role === 'courier' ? {
                courierProfile: {
                  packageRateCard: {
                    baseFare: 3.0,
                    perMile: 0.5,
                    perMinute: 0.1,
                    optionalFees: []
                  },
                  foodRateCard: {
                    baseFare: 2.5,
                    perMile: 0.75,
                    restaurantWaitPay: 0.15,
                    optionalFees: []
                  },
                  currentLocation: {
                    lat: 37.7749,
                    lng: -122.4194
                  }
                }
              } : {})
            }, { merge: true });
            console.log(`Wrote ${acct.role} user doc via firebase-admin fallback for`, acctDocId);
          } catch (e) {
            console.warn(`firebase-admin fallback failed for ${acct.role}:`, e);
          }
        }
      } else {
        console.log(`Wrote ${acct.role} user doc at users/${acctDocId}`);
      }

      // Poll for readability
      const maxAttemptsAcct = 6;
      let gotAcctDoc = false;
      for (let j = 0; j < maxAttemptsAcct; j++) {
        const checkAcct = await fetch(`${FIRESTORE_BASE}/users/${acctDocId}`);
        if (checkAcct.ok) {
          gotAcctDoc = true;
          console.log(`Verified user doc exists for ${acctDocId}`);
          break;
        }
        await new Promise((res) => setTimeout(res, 500 * (j + 1)));
      }
      if (!gotAcctDoc) {
        console.warn(`Timed out waiting for user doc to be readable: ${acctDocId}`);
      }
    } catch (e) {
      console.warn(`Failed to create ${acct.role} user doc:`, e);
    }
  }

  // Optionally write a marker file so tests can see seed completed
  writeFileSync('.e2e_seed_done', 'ok')
  console.log('E2E globalSetup: seed complete')
}
