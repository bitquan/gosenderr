const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

(async () => {
  console.log('🚀 PR #11 Feature Check\n');
  
  // Check feature flags
  const flags = await db.collection('featureFlags').doc('config').get();
  console.log('📋 Feature Flags:', flags.exists ? '✅ EXISTS' : '❌ MISSING');
  if (flags.exists) {
    const data = flags.data();
    console.log('   - Package Shipping:', data.customer?.packageShipping ? '✅ ON' : '⚪ OFF');
    console.log('   - Routes:', data.delivery?.routes ? '✅ ON' : '⚪ OFF');
    console.log('   - Long Routes:', data.delivery?.longRoutes ? '✅ ON' : '⚪ OFF');
    console.log('   - Package Runner:', data.packageRunner?.enabled ? '✅ ON' : '⚪ OFF');
  }
  
  // Check hubs
  const hubs = await db.collection('hubs').limit(3).get();
  console.log('\n🏢 Hubs:', hubs.size, 'found');
  hubs.forEach(doc => {
    const h = doc.data();
    console.log(`   - ${h.city}, ${h.state}`);
  });
  
  // Get total count
  const allHubs = await db.collection('hubs').count().get();
  console.log('   Total:', allHubs.data().count);
  
  // Check routes
  const routes = await db.collection('routes').count().get();
  console.log('\n🛣️  Routes:', routes.data().count);
  
  // Check packages
  const packages = await db.collection('packages').count().get();
  console.log('📦 Packages:', packages.data().count);
  
  console.log('\n✨ All checks complete!\n');
  process.exit(0);
})();
