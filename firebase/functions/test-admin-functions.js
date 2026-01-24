#!/usr/bin/env node

/**
 * Test script for admin Cloud Functions
 * 
 * Usage:
 *   node test-admin-functions.js
 * 
 * Note: Requires Firebase Admin SDK credentials
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function testSetAdminClaim() {
  console.log('\n=== Test: Set Admin Claim ===\n');

  const email = await question('Enter user email to promote to admin: ');

  try {
    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found user: ${userRecord.uid}`);

    // Set custom claim
    await auth.setCustomUserClaims(userRecord.uid, {
      admin: true,
      role: 'admin',
    });

    // Update Firestore
    await db.doc(`users/${userRecord.uid}`).update({
      role: 'admin',
      adminProfile: {
        permissions: ['all'],
        isSuperAdmin: false,
        promotedAt: admin.firestore.Timestamp.now(),
        promotedBy: 'SYSTEM',
        lastLoginAt: null,
        totalActions: 0,
      },
      updatedAt: admin.firestore.Timestamp.now(),
    });

    console.log('✅ Successfully promoted user to admin');
    console.log('Custom claims:', (await auth.getUser(userRecord.uid)).customClaims);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testSetPackageRunnerClaim() {
  console.log('\n=== Test: Set Package Runner Claim ===\n');

  const email = await question('Enter runner email to approve: ');

  try {
    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found user: ${userRecord.uid}`);

    // Check if user has packageRunnerProfile
    const userDoc = await db.doc(`users/${userRecord.uid}`).get();
    if (!userDoc.exists || !userDoc.data().packageRunnerProfile) {
      console.log('❌ User has no package runner profile');
      return;
    }

    const profile = userDoc.data().packageRunnerProfile;
    console.log(`Status: ${profile.status}`);
    console.log(`Vehicle: ${profile.vehicleType}`);
    console.log(`Home Hub: ${profile.homeHub}`);

    const approve = await question('Approve? (y/n): ');

    if (approve.toLowerCase() !== 'y') {
      console.log('❌ Cancelled');
      return;
    }

    // Set custom claim
    await auth.setCustomUserClaims(userRecord.uid, {
      packageRunner: true,
    });

    // Update Firestore
    await db.doc(`users/${userRecord.uid}`).update({
      'packageRunnerProfile.status': 'approved',
      'packageRunnerProfile.approvedAt': admin.firestore.Timestamp.now(),
      'packageRunnerProfile.approvedBy': 'SYSTEM',
      updatedAt: admin.firestore.Timestamp.now(),
    });

    console.log('✅ Successfully approved package runner');
    console.log('Custom claims:', (await auth.getUser(userRecord.uid)).customClaims);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function listAdmins() {
  console.log('\n=== Current Admins ===\n');

  try {
    const snapshot = await db.collection('users').where('role', '==', 'admin').get();

    if (snapshot.empty) {
      console.log('No admins found');
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`- ${data.email} (${doc.id})`);
      console.log(`  Promoted: ${data.adminProfile?.promotedAt?.toDate() || 'N/A'}`);
      console.log(`  Actions: ${data.adminProfile?.totalActions || 0}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function listPendingRunners() {
  console.log('\n=== Pending Package Runners ===\n');

  try {
    const snapshot = await db
      .collection('users')
      .where('packageRunnerProfile.status', '==', 'pending_review')
      .get();

    if (snapshot.empty) {
      console.log('No pending applications');
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const profile = data.packageRunnerProfile;
      console.log(`- ${data.email} (${doc.id})`);
      console.log(`  Vehicle: ${profile.vehicleType}`);
      console.log(`  Home Hub: ${profile.homeHub}`);
      console.log(`  Applied: ${profile.applicationSubmittedAt?.toDate()}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function viewAdminLog() {
  console.log('\n=== Recent Admin Actions ===\n');

  try {
    const snapshot = await db
      .collection('adminActionLog')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    if (snapshot.empty) {
      console.log('No admin actions logged');
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`[${data.timestamp.toDate().toISOString()}]`);
      console.log(`  Action: ${data.action}`);
      console.log(`  Admin: ${data.adminId}`);
      if (data.targetUserId) {
        console.log(`  Target: ${data.targetEmail || data.targetUserId}`);
      }
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  console.log('🔥 GoSenderr Admin Functions Test\n');

  while (true) {
    console.log('\nOptions:');
    console.log('1. Promote user to admin');
    console.log('2. Approve package runner');
    console.log('3. List all admins');
    console.log('4. List pending runners');
    console.log('5. View admin action log');
    console.log('0. Exit');

    const choice = await question('\nSelect option: ');

    switch (choice) {
      case '1':
        await testSetAdminClaim();
        break;
      case '2':
        await testSetPackageRunnerClaim();
        break;
      case '3':
        await listAdmins();
        break;
      case '4':
        await listPendingRunners();
        break;
      case '5':
        await viewAdminLog();
        break;
      case '0':
        console.log('\nGoodbye! 👋\n');
        rl.close();
        process.exit(0);
        break;
      default:
        console.log('Invalid option');
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
