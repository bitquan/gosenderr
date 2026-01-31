#!/usr/bin/env node

/**
 * Seed Feature Flags to Firestore
 * Run: node scripts/seed-feature-flags.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
initializeApp({ projectId: 'gosenderr-6773f' });
const db = getFirestore();

const featureFlagsData = {
  marketplace: {
    enabled: true,
    itemListings: true,
    combinedPayments: true
  },
  delivery: {
    onDemand: true,
    routes: true,
    longRoutes: true,
    longHaul: true
  },
  courier: {
    rateCards: true,
    equipmentBadges: true,
    workModes: true
  },
  seller: {
    stripeConnect: true,
    multiplePhotos: true,
    foodListings: true
  },
  customer: {
    liveTracking: true,
    proofPhotos: true,
    routeDelivery: true,
    packageShipping: true
  },
  packageRunner: {
    enabled: true,
    hubNetwork: true,
    packageTracking: true
  },
  admin: {
    courierApproval: true,
    equipmentReview: true,
    disputeManagement: true,
    analytics: true,
    featureFlagsControl: true
  },
  advanced: {
    pushNotifications: false,
    ratingEnforcement: true,
    autoCancel: true,
    refunds: true
  },
  ui: {
    modernStyling: true,
    darkMode: false,
    animations: true
  }
};

async function seedFeatureFlags() {
  try {
    console.log('🌱 Seeding feature flags...');
    
    await db.collection('featureFlags').doc('config').set(featureFlagsData);
    
    console.log('✅ Feature flags seeded successfully!');
    console.log('📊 Categories seeded:', Object.keys(featureFlagsData).length);
    
    // Count total flags
    const totalFlags = Object.values(featureFlagsData).reduce(
      (sum, category) => sum + Object.keys(category).length,
      0
    );
    console.log('🎚️  Total flags:', totalFlags);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding feature flags:', error);
    process.exit(1);
  }
}

seedFeatureFlags();
