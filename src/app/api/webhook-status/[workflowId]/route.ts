import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase Client SDK
let clientDb: any = null;

if (!getApps().length) {
  const app = initializeApp(firebaseConfig);
  clientDb = getFirestore(app);
} else {
  const app = getApps()[0];
  clientDb = getFirestore(app);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await params;
  const authToken = request.nextUrl.searchParams.get('token');
  const expectedToken = process.env.WEBHOOK_SECRET_TOKEN;

  if (authToken !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First, find the webhook registration to get userId
    const webhooksCollection = collection(clientDb, 'webhooks');
    const webhooksSnapshot = await getDocs(webhooksCollection);

    let userId: string | null = null;

    for (const webhookDoc of webhooksSnapshot.docs) {
      const data = webhookDoc.data();
      if (data.workflowId === workflowId) {
        userId = data.userId;
        break;
      }
    }

    if (!userId) {
      return NextResponse.json({
        error: 'Workflow not found in webhook registrations'
      }, { status: 404 });
    }

    // Get last 5 executions
    const executionsRef = collection(
      clientDb,
      'users',
      userId,
      'workflows',
      workflowId,
      'executions'
    );

    const executionsQuery = query(
      executionsRef,
      orderBy('startedAt', 'desc'),
      limit(5)
    );

    const executionsSnapshot = await getDocs(executionsQuery);
    const executions = executionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      workflowId,
      totalExecutions: executionsSnapshot.size,
      executions,
    });
  } catch (error) {
    console.error('[WebhookStatus] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch executions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
