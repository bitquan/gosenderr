import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs } from 'firebase/firestore';

const app = initializeApp({
  apiKey: "YOUR_FIREBASE_API_KEY_PLACEHOLDER",
  projectId: "gosenderr-6773f"
});
const db = getFirestore(app);

console.log('🚀 Testing PR #11 Features\n');

// Test feature flags
const flagsDoc = await getDoc(doc(db, 'featureFlags', 'config'));
console.log('📋 Feature Flags:', flagsDoc.exists() ? '✅' : '❌');
if (flagsDoc.exists()) {
  const flags = flagsDoc.data();
  console.log(`   Package Shipping: ${flags.customer?.packageShipping ? '✅ ON' : '❌ OFF'}`);
  console.log(`   Routes: ${flags.delivery?.routes ? '✅ ON' : '❌ OFF'}`);
}

// Test hubs
const hubsSnapshot = await getDocs(collection(db, 'hubs'));
console.log(`\n🏢 Hubs: ${hubsSnapshot.size} found`);

console.log('\n✨ Tests complete!\n');
