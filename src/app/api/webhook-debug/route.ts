import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    // Decodifica y parsea la clave Base64 del service account
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || "", "base64").toString("utf-8");
    const serviceAccount = JSON.parse(decoded);

    initializeApp({
      credential: cert(serviceAccount)
    });

    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || "", "base64").toString("utf-8");
    console.error(decoded);
    console.error("Failed to initialize Firebase Admin SDK:", error);
    // Inicializa sin credenciales para evitar crash en entornos locales
    initializeApp();
  }
}
const db = getFirestore();

export async function GET() {
  try {
    const usersSnapshot = await db.collection('users').get();
    const allWorkflows: any[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const workflowsSnapshot = await db
        .collection('users')
        .doc(userDoc.id)
        .collection('workflows')
        .get();

      for (const workflowDoc of workflowsSnapshot.docs) {
        const data = workflowDoc.data();
        allWorkflows.push({
          id: workflowDoc.id,
          userId: userDoc.id,
          name: data.name,
          status: data.status,
          webhookPath: data.webhookPath || null,
          hasWebhookNode: data.nodes?.some((n: any) => n.type === 'webhook_trigger') || false,
          webhookNodeConfig: data.nodes?.find((n: any) => n.type === 'webhook_trigger')?.config || null,
        });
      }
    }

    return NextResponse.json({
      totalUsers: usersSnapshot.docs.length,
      totalWorkflows: allWorkflows.length,
      workflows: allWorkflows,
    });
  } catch (error) {
    console.error('[WebhookDebug] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
