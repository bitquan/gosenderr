import { writeFileSync } from 'fs'
import fetch from 'node-fetch'

// Playwright globalSetup must export default async function
export default async function globalSetup() {
  console.log('E2E globalSetup: seeding test data')

  const FIRESTORE_BASE = 'http://127.0.0.1:8080/v1/projects/gosenderr-6773f/databases/(default)/documents'
  const AUTH_SIGNUP = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key'

  // Create vendor user via Auth emulator
  try {
    await fetch(AUTH_SIGNUP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vender@sender.com', password: 'admin123', returnSecureToken: true }),
    })
  } catch (e) {
    console.warn('Auth signup returned error (maybe already exists):', e)
  }

  // Create vendor user doc
  try {
    await fetch(`${FIRESTORE_BASE}/users/vendor`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { email: { stringValue: 'vender@sender.com' }, role: { stringValue: 'vendor' }, displayName: { stringValue: 'Test Vendor' }, createdAt: { timestampValue: new Date().toISOString() } } }),
    })
  } catch (e) {
    console.warn('Failed to create vendor user doc:', e)
  }

  // Create sample item
  try {
    await fetch(`${FIRESTORE_BASE}/items/test-item-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { title: { stringValue: 'Test Item for E2E' }, description: { stringValue: 'Seeded test item' }, price: { doubleValue: 19.99 }, status: { stringValue: 'available' }, sellerId: { stringValue: 'seller' }, sellerName: { stringValue: 'Test Seller' }, createdAt: { timestampValue: new Date().toISOString() } } }),
    })
  } catch (e) {
    console.warn('Failed to create test item:', e)
  }

  // Optionally write a marker file so tests can see seed completed
  writeFileSync('.e2e_seed_done', 'ok')
  console.log('E2E globalSetup: seed complete')
}
