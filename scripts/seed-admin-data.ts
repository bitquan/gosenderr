// Seed admin-specific data: categories, feature flags, platform settings
const adminModule = require('./firebase-admin-wrapper');

// Connect to emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

adminModule.initializeApp({
  projectId: 'gosenderr-6773f'
});

const db = adminModule.firestore();
const Timestamp = adminModule.firestore.Timestamp;

async function seedAdminData() {
  console.log('🌱 Seeding admin data...\n');

  // 1. Seed Categories
  console.log('📁 Creating categories...');
  const categories = [
    { id: 'electronics', name: 'Electronics', icon: '📱', order: 1 },
    { id: 'fashion', name: 'Fashion & Apparel', icon: '👕', order: 2 },
    { id: 'home', name: 'Home & Garden', icon: '🏡', order: 3 },
    { id: 'sports', name: 'Sports & Outdoors', icon: '⚽', order: 4 },
    { id: 'books', name: 'Books & Media', icon: '📚', order: 5 },
    { id: 'toys', name: 'Toys & Games', icon: '🎮', order: 6 },
    { id: 'beauty', name: 'Beauty & Health', icon: '💄', order: 7 },
    { id: 'automotive', name: 'Automotive', icon: '🚗', order: 8 },
    { id: 'food', name: 'Food & Beverages', icon: '🍔', order: 9 },
    { id: 'other', name: 'Other', icon: '📦', order: 10 }
  ];

  for (const category of categories) {
    await db.collection('categories').doc(category.id).set({
      ...category,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    console.log(`  ✓ Created category: ${category.name}`);
  }

  // 2. Seed Feature Flags
  console.log('\n🎚️ Creating feature flags...');
  const featureFlags = [
    { id: 'marketplace_enabled', name: 'Marketplace Enabled', description: 'Enable/disable marketplace features', enabled: true, category: 'marketplace' },
    { id: 'vendor_registration', name: 'Vendor Registration', description: 'Allow new vendor signups', enabled: true, category: 'marketplace' },
    { id: 'courier_registration', name: 'Courier Registration', description: 'Allow new courier signups', enabled: true, category: 'delivery' },
    { id: 'item_auto_approve', name: 'Auto-approve Items', description: 'Automatically approve new marketplace items', enabled: false, category: 'marketplace' },
    { id: 'stripe_payments', name: 'Stripe Payments', description: 'Enable Stripe payment processing', enabled: true, category: 'payments' },
    { id: 'email_notifications', name: 'Email Notifications', description: 'Send email notifications to users', enabled: true, category: 'notifications' },
    { id: 'maintenance_mode', name: 'Maintenance Mode', description: 'Put platform in maintenance mode', enabled: false, category: 'system' },
    { id: 'reviews_enabled', name: 'Reviews & Ratings', description: 'Allow users to leave reviews', enabled: true, category: 'marketplace' }
  ];

  for (const flag of featureFlags) {
    await db.collection('featureFlags').doc(flag.id).set({
      ...flag,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    console.log(`  ✓ Created flag: ${flag.name}`);
  }

  // 3. Seed Platform Settings
  console.log('\n⚙️ Creating platform settings...');
  const settings = {
    general: {
      platformName: 'GoSenderR',
      platformDescription: 'On-demand delivery and marketplace platform',
      supportEmail: 'support@gosenderr.com',
      contactPhone: '+1 (555) 123-4567',
      maintenanceMode: false,
      maintenanceMessage: 'We are currently performing maintenance. Please check back soon.'
    },
    marketplace: {
      commissionRate: 0.15, // 15%
      minimumOrderAmount: 5.00,
      maximumImagesPerItem: 10,
      autoApproveItems: false,
      listingDurationDays: 90,
      featuredItemSlots: 6
    },
    payments: {
      stripeEnabled: true,
      stripePublishableKey: 'pk_test_...',
      platformFeePercentage: 15,
      minimumWithdrawal: 25.00,
      withdrawalProcessingDays: 3
    },
    delivery: {
      baseFee: 6.00,
      perMile: 1.25,
      perMinute: 0.25,
      minimumFee: 8.00,
      maxPickupMiles: 20,
      maxJobMiles: 60,
      maxRadiusMiles: 25
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      orderConfirmationEmail: true,
      orderStatusEmail: true,
      vendorNewOrderEmail: true,
      courierJobAssignedEmail: true
    },
    // Token policy for token wallet / packs (seeded for local dev & emulators)
    tokenPolicy: {
      enabled: true,
      finalSale: true,
      tokenValueUsd: 1,
      costs: {
        jobUnlockStandard: 1,
        jobUnlockPriority: 2,
        jobUnlockHeavy: 3,
        listingPublish: 2,
        cashFee: 1,
        adBoost24h: 5,
        adBoost7d: 25,
        adBoost30d: 80,
        adFeatured7d: 120,
      },
      packs: [
        { id: 'starter_10', tokens: 10, priceUsd: 10 },
        { id: 'starter_100', name: 'Starter 100', tokens: 100, priceUsd: 10, active: true },
        { id: 'pro_250', name: 'Pro 250', tokens: 250, priceUsd: 25, active: true }
      ]
    }
  };

  for (const [key, value] of Object.entries(settings)) {
    await db.collection('platformSettings').doc(key).set({
      ...value,
      updatedAt: Timestamp.now(),
      updatedBy: 'system'
    });
    console.log(`  ✓ Created settings: ${key}`);
  }

  // 4. Create sample admin log entry
  console.log('\n📝 Creating sample admin log...');
  await db.collection('adminLogs').add({
    action: 'platform_initialized',
    description: 'Platform data seeded successfully',
    adminUid: 'system',
    adminEmail: 'system@gosenderr.com',
    timestamp: Timestamp.now(),
    details: {
      categories: categories.length,
      featureFlags: featureFlags.length,
      settingsGroups: Object.keys(settings).length
    }
  });
  console.log('  ✓ Created admin log entry');

  console.log('\n✅ Admin data seeded successfully!');
  console.log(`\n📊 Summary:`);
  console.log(`   ${categories.length} categories`);
  console.log(`   ${featureFlags.length} feature flags`);
  console.log(`   ${Object.keys(settings).length} settings groups`);
  console.log(`   1 admin log entry`);
}

seedAdminData()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error seeding admin data:', error);
    process.exit(1);
  });
