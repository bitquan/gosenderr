import { collection, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Individual feature flag documents (for admin-desktop)
const FEATURE_FLAGS = [
  // Marketplace
  { name: 'Marketplace', description: 'Enable marketplace item listings and purchases', enabled: true, category: 'marketplace' },
  { name: 'Item Listings', description: 'Allow vendors to list items for sale', enabled: true, category: 'marketplace' },
  { name: 'Combined Payments', description: 'Combine marketplace and delivery payments', enabled: true, category: 'marketplace' },
  { name: 'Courier Offers', description: 'Enable courier offers in checkout', enabled: false, category: 'marketplace' },
  
  // Delivery
  { name: 'On-Demand Delivery', description: 'Enable on-demand courier deliveries', enabled: true, category: 'delivery' },
  { name: 'Route Delivery', description: 'Enable scheduled route deliveries', enabled: true, category: 'delivery' },
  { name: 'Long Routes', description: 'Enable regional routes (50-200mi)', enabled: true, category: 'delivery' },
  { name: 'Long Haul', description: 'Enable interstate routes (200+mi)', enabled: true, category: 'delivery' },
  { name: 'Live Tracking', description: 'Real-time delivery tracking on map', enabled: true, category: 'delivery' },
  
  // Courier
  { name: 'Courier Rate Cards', description: 'Custom rate cards per courier', enabled: true, category: 'system' },
  { name: 'Equipment Badges', description: 'Show equipment approval badges', enabled: true, category: 'system' },
  { name: 'Work Modes', description: 'Toggle between package/food delivery modes', enabled: true, category: 'system' },
  
  // Payments
  { name: 'Stripe Connect', description: 'Stripe Connect for vendor payments', enabled: true, category: 'payments' },
  { name: 'Stripe Payments', description: 'Enable Stripe payment processing', enabled: true, category: 'payments' },
  { name: 'Refunds', description: 'Enable refund processing', enabled: true, category: 'payments' },
  
  // Customer
  { name: 'Proof Photos', description: 'Require delivery proof photos', enabled: true, category: 'system' },
  { name: 'Package Shipping', description: 'Enable package shipping service', enabled: true, category: 'delivery' },
  
  // Package Runner
  { name: 'Package Runners', description: 'Enable package runner network', enabled: true, category: 'delivery' },
  { name: 'Hub Network', description: 'Enable hub-to-hub shipping', enabled: true, category: 'delivery' },
  { name: 'Package Tracking', description: 'Track packages across hubs', enabled: true, category: 'system' },
  
  // Admin
  { name: 'Courier Approval', description: 'Manual courier approval workflow', enabled: true, category: 'system' },
  { name: 'Equipment Review', description: 'Review courier equipment submissions', enabled: true, category: 'system' },
  { name: 'Dispute Management', description: 'Handle user disputes', enabled: true, category: 'system' },
  { name: 'Analytics', description: 'Platform analytics dashboard', enabled: true, category: 'system' },
  { name: 'System Logs', description: 'View local admin-desktop logs', enabled: false, category: 'system' },
  { name: 'Firebase Explorer', description: 'Read-only Firestore viewer', enabled: false, category: 'system' },
  
  // Notifications
  { name: 'Push Notifications', description: 'Mobile push notifications', enabled: false, category: 'notifications' },
  { name: 'Email Notifications', description: 'Email notification system', enabled: true, category: 'notifications' },
  { name: 'SMS Notifications', description: 'SMS text notifications', enabled: false, category: 'notifications' },
  
  // Advanced
  { name: 'Rating Enforcement', description: 'Enforce rating requirements', enabled: true, category: 'system' },
  { name: 'Auto Cancel', description: 'Auto-cancel stale jobs', enabled: true, category: 'system' },
  { name: 'Dark Mode', description: 'Enable dark mode UI', enabled: false, category: 'system' }
];

// Top marginal single-filer state income tax rates (as of 2026-01-17; source: Wikipedia)
const STATE_TAX_RATES: Record<string, number> = {
  AK: 0.0,
  AL: 0.05,
  AR: 0.039,
  AZ: 0.025,
  CA: 0.133,
  CO: 0.044,
  CT: 0.0699,
  DC: 0.1075,
  DE: 0.066,
  FL: 0.0,
  GA: 0.0539,
  HI: 0.11,
  IA: 0.038,
  ID: 0.05695,
  IL: 0.0495,
  IN: 0.03,
  KS: 0.0558,
  KY: 0.04,
  LA: 0.03,
  MA: 0.09,
  MD: 0.0575,
  ME: 0.0715,
  MI: 0.0425,
  MN: 0.0985,
  MO: 0.047,
  MS: 0.044,
  MT: 0.059,
  NC: 0.0425,
  ND: 0.025,
  NE: 0.052,
  NH: 0.0,
  NJ: 0.1075,
  NM: 0.059,
  NV: 0.0,
  NY: 0.109,
  OH: 0.035,
  OK: 0.0475,
  OR: 0.099,
  PA: 0.0307,
  RI: 0.0599,
  SC: 0.062,
  SD: 0.0,
  TN: 0.0,
  TX: 0.0,
  UT: 0.0455,
  VA: 0.0575,
  VT: 0.0875,
  WA: 0.0,
  WI: 0.0765,
  WV: 0.0482,
  WY: 0.0,
};

// Nested config (for courier/customer apps compatibility)
export const FEATURE_FLAGS_CONFIG = {
  marketplace: {
    enabled: true,
    itemListings: true,
    combinedPayments: true,
    courierOffers: false
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
    featureFlagsControl: true,
    webPortalEnabled: false,
    systemLogs: false,
    firebaseExplorer: false
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

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export async function seedFeatureFlags() {
  try {
    console.log('🌱 Seeding feature flags...');
    
    // Add individual flag documents for admin-desktop
    for (const flag of FEATURE_FLAGS) {
      const flagId = `${flag.category}_${slugify(flag.name)}`;
      const flagRef = doc(collection(db, 'featureFlags'), flagId);
      const existing = await getDoc(flagRef);
      const existingData = existing.exists() ? (existing.data() as any) : null;

      await setDoc(
        flagRef,
        {
          ...flag,
          enabled: existingData?.enabled ?? flag.enabled,
          createdAt: existingData?.createdAt ?? Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    }
    
    // Seed config defaults without clobbering existing operator toggles.
    const configRef = doc(db, 'featureFlags', 'config');
    const configSnapshot = await getDoc(configRef);
    const existingConfig = configSnapshot.exists() ? (configSnapshot.data() as any) : {};

    const mergedConfig = {
      ...FEATURE_FLAGS_CONFIG,
      ...existingConfig,
      marketplace: { ...FEATURE_FLAGS_CONFIG.marketplace, ...(existingConfig.marketplace ?? {}) },
      delivery: { ...FEATURE_FLAGS_CONFIG.delivery, ...(existingConfig.delivery ?? {}) },
      courier: { ...FEATURE_FLAGS_CONFIG.courier, ...(existingConfig.courier ?? {}) },
      seller: { ...FEATURE_FLAGS_CONFIG.seller, ...(existingConfig.seller ?? {}) },
      customer: { ...FEATURE_FLAGS_CONFIG.customer, ...(existingConfig.customer ?? {}) },
      packageRunner: { ...FEATURE_FLAGS_CONFIG.packageRunner, ...(existingConfig.packageRunner ?? {}) },
      admin: { ...FEATURE_FLAGS_CONFIG.admin, ...(existingConfig.admin ?? {}) },
      advanced: { ...FEATURE_FLAGS_CONFIG.advanced, ...(existingConfig.advanced ?? {}) },
      ui: { ...FEATURE_FLAGS_CONFIG.ui, ...(existingConfig.ui ?? {}) },
    };

    // Also add config document for courier/customer apps
    await setDoc(configRef, mergedConfig, { merge: true });
    
    console.log(`✅ Seeded ${FEATURE_FLAGS.length} feature flags + config document`);
    return true;
  } catch (error) {
    console.error('❌ Error seeding feature flags:', error);
    throw error;
  }
}

export async function seedStateTaxRates() {
  try {
    console.log('🌱 Seeding state tax rates...');

    await setDoc(
      doc(db, 'platformSettings', 'stateTaxRates'),
      {
        rates: STATE_TAX_RATES,
        source: 'Wikipedia (State income tax)',
        sourceUpdatedAt: '2026-01-17',
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    console.log('✅ Seeded state tax rates');
    return true;
  } catch (error) {
    console.error('❌ Error seeding state tax rates:', error);
    throw error;
  }
}
