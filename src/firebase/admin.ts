import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

let app: admin.app.App;

if (!admin.apps.length) {
  try {
    // Try to read service account from firebasesdk.json file
    const serviceAccountPath = join(process.cwd(), 'firebasesdk.json');
    const serviceAccountFile = readFileSync(serviceAccountPath, 'utf-8');
    const serviceAccount = JSON.parse(serviceAccountFile);

    // Validate required fields
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error("Service account is missing required fields (project_id, private_key, or client_email).");
    }

    // Replace escaped newlines in the private key
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'studio-7497860674-b91ac.firebasestorage.app',
    });

    console.log("Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    console.error("Make sure firebasesdk.json exists in the project root");
    throw error;
  }
} else {
  app = admin.app();
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

export function getFirebaseAdmin() {
  return { app, db, auth, storage };
}