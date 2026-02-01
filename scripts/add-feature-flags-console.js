#!/usr/bin/env node

// Simple script to add feature flags via Firebase Web SDK (client-side)
// Run this in the browser console at http://localhost:5176

const featureFlags = [
  { name: 'Marketplace', description: 'Enable marketplace item listings and purchases', enabled: true, category: 'marketplace' },
  { name: 'Package Shipping', description: 'Enable package shipping and long-haul delivery', enabled: true, category: 'delivery' },
  { name: 'Stripe Payments', description: 'Enable Stripe payment processing', enabled: true, category: 'payments' },
  { name: 'Push Notifications', description: 'Enable push notifications for mobile apps', enabled: false, category: 'notifications' },
  { name: 'Email Notifications', description: 'Enable email notifications', enabled: true, category: 'notifications' },
  { name: 'SMS Notifications', description: 'Enable SMS text notifications', enabled: false, category: 'notifications' },
  { name: 'Live Tracking', description: 'Enable real-time delivery tracking on map', enabled: true, category: 'delivery' },
  { name: 'Disputes System', description: 'Enable dispute filing and resolution', enabled: true, category: 'system' },
  { name: 'Ratings & Reviews', description: 'Enable user ratings and reviews', enabled: true, category: 'system' }
];

// Copy this into browser console:
console.log(`
// Paste this in the browser console (F12) while on the admin app:
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './lib/firebase';

const flags = ${JSON.stringify(featureFlags, null, 2)};

async function addFlags() {
  for (const flag of flags) {
    await addDoc(collection(db, 'featureFlags'), {
      ...flag,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }
  console.log('✅ Added', flags.length, 'feature flags');
}

addFlags();
`);
