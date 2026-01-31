import { collection, doc, setDoc, addDoc, Timestamp } from 'firebase/firestore';
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
  
  // Notifications
  { name: 'Push Notifications', description: 'Mobile push notifications', enabled: false, category: 'notifications' },
  { name: 'Email Notifications', description: 'Email notification system', enabled: true, category: 'notifications' },
  { name: 'SMS Notifications', description: 'SMS text notifications', enabled: false, category: 'notifications' },
  
  // Advanced
  { name: 'Rating Enforcement', description: 'Enforce rating requirements', enabled: true, category: 'system' },
  { name: 'Auto Cancel', description: 'Auto-cancel stale jobs', enabled: true, category: 'system' },
  { name: 'Dark Mode', description: 'Enable dark mode UI', enabled: false, category: 'system' }
];

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
    webPortalEnabled: false
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

export async function seedFeatureFlags() {
  try {
    console.log('🌱 Seeding feature flags...');
    
    // Add individual flag documents for admin-desktop
    for (const flag of FEATURE_FLAGS) {
      await addDoc(collection(db, 'featureFlags'), {
        ...flag,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }
    
    // Also add config document for courier/customer apps
    await setDoc(doc(db, 'featureFlags', 'config'), FEATURE_FLAGS_CONFIG);
    
    console.log(`✅ Seeded ${FEATURE_FLAGS.length} feature flags + config document`);
    return true;
  } catch (error) {
    console.error('❌ Error seeding feature flags:', error);
    throw error;
  }
}
