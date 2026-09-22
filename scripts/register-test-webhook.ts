/**
 * Script to manually register a test webhook in Firestore
 * Run with: npx tsx scripts/register-test-webhook.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase/config';

async function registerTestWebhook() {
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Replace these with your actual values
  const userId = 'YOUR_USER_ID'; // Get this from Firebase Console or your app
  const workflowId = 'YOUR_WORKFLOW_ID'; // Get this from your workflow URL
  const webhookPath = 'test';

  console.log('Registering webhook...');
  console.log('User ID:', userId);
  console.log('Workflow ID:', workflowId);
  console.log('Webhook Path:', webhookPath);

  const webhookDocId = webhookPath.replace(/\//g, '_');
  const webhookRef = doc(db, 'webhooks', webhookDocId);

  try {
    await setDoc(webhookRef, {
      userId: userId,
      workflowId: workflowId,
      workflowName: 'Test Workflow',
      webhookPath: webhookPath,
      updatedAt: serverTimestamp(),
    });

    console.log('✓ Webhook registered successfully!');
    console.log(`Test with: curl -X POST "YOUR_URL/api/webhook/${webhookPath}?token=nodify_webhook_secret_2024" -H "Content-Type: application/json" -d '{"test": true}'`);
  } catch (error) {
    console.error('✗ Failed to register webhook:', error);
    console.error('Make sure Firestore rules allow writing to /webhooks collection');
  }

  process.exit(0);
}

registerTestWebhook();
