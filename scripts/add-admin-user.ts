import pkg from 'firebase-admin';
const admin = pkg;
const { credential } = pkg;
import 'dotenv/config'; // Load environment variables
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin SDK
try {
  admin.app(); // Try to get the default app
} catch (e) {
  try {
    // Read service account from firebasesdk.json file
    const serviceAccountPath = join(process.cwd(), 'firebasesdk.json');
    const serviceAccountFile = readFileSync(serviceAccountPath, 'utf-8');
    const serviceAccount = JSON.parse(serviceAccountFile);

    // Validate required fields
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      console.error('Error: Service account is missing required fields.');
      console.error('Required: project_id, private_key, client_email');
      process.exit(1);
    }

    // Replace escaped newlines in the private key
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'studio-7497860674-b91ac.firebasestorage.app',
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
    console.error('Make sure firebasesdk.json exists in the project root');
    process.exit(1);
  }
}

const db = admin.firestore();

async function addAdminUser() {
  const uid = process.argv[2]; // Get UID from command line argument

  if (!uid || uid === 'tu-user-id') {
    console.error('Usage: npx tsx scripts/add-admin-user.ts <FIREBASE_AUTH_UID>');
    console.error('Please provide a valid Firebase Authentication UID.');
    process.exit(1);
  }

  console.log(`\n🔍 Looking up user with UID: ${uid}\n`);

  // Try to get user info from Firebase Auth
  let userEmail = "admin@nodify.com";
  let displayName = "Super Admin";

  try {
    const userRecord = await admin.auth().getUser(uid);
    userEmail = userRecord.email || userEmail;
    displayName = userRecord.displayName || userRecord.email?.split('@')[0] || displayName;

    console.log(`✅ Found user in Firebase Auth:`);
    console.log(`   Email: ${userEmail}`);
    console.log(`   Display Name: ${displayName}`);
  } catch (error) {
    console.warn(`⚠️  User not found in Firebase Auth. Using default values.`);
    console.warn(`   Make sure the user exists in Firebase Authentication.\n`);
  }

  const adminUserData = {
    uid: uid,
    role: "super_admin",
    accountStatus: "active",
    profile: {
      email: userEmail,
      displayName: displayName
    },
    subscription: {
      plan: "enterprise",
      status: "active",
      limits: {
        maxWorkflows: -1, // Unlimited
        maxNodesPerWorkflow: -1,
        maxExecutionsPerMonth: -1,
        maxCustomNodes: -1,
        maxApiCalls: -1,
        maxStorage: -1,
        maxTeamMembers: -1,
        canUseAI: true,
        canUseAdvancedNodes: true,
        canUseScheduler: true,
        canUseWebhooks: true,
        prioritySupport: true,
        customBranding: true,
      }
    },
    usage: {
      workflowCount: 0,
      executionsThisMonth: 0,
      apiCallsThisMonth: 0,
      storageUsed: 0,
      customNodesCreated: 0,
      lastResetDate: admin.firestore.FieldValue.serverTimestamp()
    },
    preferences: {
      emailNotifications: true,
      workflowNotifications: true,
      errorNotifications: true,
      weeklyReport: false,
      marketingEmails: false,
      defaultWorkflowStatus: "draft",
      autoSaveInterval: 30,
      showTutorials: false,
      compactMode: false
    },
    stats: {
      totalWorkflows: 0,
      activeWorkflows: 0,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalCustomNodes: 0,
      totalCredentials: 0,
      totalTables: 0
    },
    staffInfo: {
      department: "management",
      title: "Super Administrator",
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      assignedBy: "system",
      internalNotes: "Initial super admin account"
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('users').doc(uid).set(adminUserData);

    console.log(`\n✅ Successfully created super_admin user!\n`);
    console.log(`📋 User Details:`);
    console.log(`   UID: ${uid}`);
    console.log(`   Email: ${userEmail}`);
    console.log(`   Display Name: ${displayName}`);
    console.log(`   Role: super_admin`);
    console.log(`   Status: active`);
    console.log(`   Plan: enterprise (unlimited)`);
    console.log(`\n🎉 You can now login with this account and access /admin\n`);
  } catch (error) {
    console.error('\n❌ Error adding admin user:', error);
    process.exit(1);
  }
}

addAdminUser();
