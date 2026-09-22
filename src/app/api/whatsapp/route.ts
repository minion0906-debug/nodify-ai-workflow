import { NextRequest, NextResponse } from 'next/server';
import { whatsappRegistry } from '@/lib/db/sqlite';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

/**
 * API para registrar/actualizar/eliminar Webhooks de WhatsApp en SQLite
 * POST /api/whatsapp  -> upsert
 * DELETE /api/whatsapp?whatsappId=... -> delete
 */

// Firebase client for reading credentials if provided
let clientDb: any = null;
if (!getApps().length) {
  const app = initializeApp(firebaseConfig);
  clientDb = getFirestore(app);
} else {
  const app = getApps()[0];
  clientDb = getFirestore(app);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { whatsappId, userId, workflowId, status, verifyToken, appSecret, credentialId } = body || {};

    if (!whatsappId || !userId || !workflowId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: whatsappId, userId, workflowId' },
        { status: 400 }
      );
    }

    let finalVerifyToken = verifyToken || '';
    let finalAppSecret = appSecret || '';

    // If a credentialId is provided, try to read verifyToken/appSecret from it
    if ((!finalVerifyToken || !finalAppSecret) && credentialId && clientDb) {
      try {
        const credRef = doc(clientDb, 'users', userId, 'credentials', credentialId);
        const credSnap = await getDoc(credRef);
        if (credSnap.exists()) {
          const data: any = credSnap.data();
          const d = data?.data || {};
          // Extend whatsapp credential to optionally include these fields
          if (!finalVerifyToken && d.verifyToken) finalVerifyToken = d.verifyToken;
          if (!finalAppSecret && d.appSecret) finalAppSecret = d.appSecret;
        }
      } catch (e) {
        console.warn('[API:WhatsApp] Failed to read credential:', e);
      }
    }

    whatsappRegistry.upsert(whatsappId, {
      userId,
      workflowId,
      status: status || 'draft',
      verifyToken: finalVerifyToken || null,
      appSecret: finalAppSecret || null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error registrando WhatsApp', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const whatsappId = searchParams.get('whatsappId');

    if (!whatsappId) {
      return NextResponse.json({ error: 'Falta whatsappId' }, { status: 400 });
    }

    whatsappRegistry.delete(whatsappId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error eliminando WhatsApp', details: String(error) }, { status: 500 });
  }
}
