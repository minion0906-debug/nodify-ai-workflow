import { NextRequest, NextResponse } from 'next/server';
import { webhookRegistry, webhookCalls, workflowExecutions, executionEvents } from '@/lib/db/sqlite';
import { randomBytes } from 'crypto';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { ServerWorkflowExecutor } from '@/lib/server-workflow-executor';

interface WebhookData {
  body: any;
  query: Record<string, string>;
  headers: Record<string, string>;
  method: string;
  path: string;
}

// Initialize Firebase Client SDK for server-side usage
let clientDb: any = null;

if (!getApps().length) {
  const app = initializeApp(firebaseConfig);
  clientDb = getFirestore(app);
} else {
  const app = getApps()[0];
  clientDb = getFirestore(app);
}

/**
 * Production Webhook Handler - SQLite Version
 * Only executes workflows that are ACTIVE
 */
async function handleWebhookRequest(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  const { webhookId } = await params;
  const method = request.method;

  console.log(`[Webhook:Prod] Received ${method} request for webhookId: ${webhookId}`);

  try {
    // 1. Fast lookup from SQLite (O(1) with index)
    const webhook = webhookRegistry.getById(webhookId);

    if (!webhook) {
      console.log('[Webhook:Prod] Webhook not found:', webhookId);
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // 2. Verify HTTP method matches
    if (webhook.method !== method) {
      console.log(`[Webhook:Prod] Method mismatch. Expected: ${webhook.method}, Got: ${method}`);
      return NextResponse.json(
        { error: `Method not allowed. This webhook expects ${webhook.method}` },
        { status: 405 }
      );
    }

    console.log('[Webhook:Prod] Found webhook:', {
      workflowId: webhook.workflow_id,
      userId: webhook.user_id,
      status: webhook.status
    });

    // 3. Parse request data
    const url = new URL(request.url);
    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    // Parse headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Parse body based on content type
    let body: any = null;
    const contentType = request.headers.get('content-type') || '';

    if (method !== 'GET' && method !== 'HEAD') {
      try {
        if (contentType.includes('application/json')) {
          body = await request.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData();
          body = Object.fromEntries(formData);
        } else if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          body = Object.fromEntries(formData);
        } else {
          const text = await request.text();
          body = text || null;
        }
      } catch (error) {
        console.warn('[Webhook:Prod] Failed to parse body:', error);
        body = null;
      }
    }

    const webhookData: WebhookData = {
      body,
      query,
      headers,
      method,
      path: url.pathname
    };

    console.log('[Webhook:Prod] Parsed data:', JSON.stringify(webhookData, null, 2));

    // 4. Save webhook call to SQLite
    webhookCalls.create({
      webhookId,
      mode: 'production',
      method,
      body,
      query,
      headers,
      path: url.pathname,
      workflowStatus: webhook.status
    });

    console.log('[Webhook:Prod] Saved webhook call to SQLite');

    // 5. PRODUCTION: Only execute if workflow is ACTIVE
    if (webhook.status !== 'active') {
      console.log('[Webhook:Prod] Workflow is not active, skipping execution');
      return NextResponse.json({
        status: 'ok',
        message: 'Webhook received but workflow is not active'
      });
    }

    // 6. Create execution record
    const executionId = `exec_${Date.now()}_${randomBytes(8).toString('hex')}`;

    workflowExecutions.create({
      id: executionId,
      workflowId: webhook.workflow_id,
      userId: webhook.user_id,
      webhookId,
      mode: 'production',
      trigger: 'webhook',
      webhookData
    });

    console.log('[Webhook:Prod] Created execution:', executionId);

    // 7. Fetch workflow data from Firestore
    const workflowRef = doc(clientDb, 'users', webhook.user_id, 'workflows', webhook.workflow_id);
    const workflowSnap = await getDoc(workflowRef);

    if (!workflowSnap.exists()) {
      console.error('[Webhook:Prod] Workflow document not found in Firestore');
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const workflowData = workflowSnap.data();
    const serverWorkflow = {
      id: webhook.workflow_id,
      name: workflowData.name || 'Unnamed Workflow',
      status: workflowData.status || 'active',
      nodes: workflowData.nodes || [],
      connections: workflowData.connections || []
    };

    console.log('[Webhook:Prod] Fetched workflow:', {
      id: serverWorkflow.id,
      name: serverWorkflow.name,
      nodeCount: serverWorkflow.nodes.length,
      connectionCount: serverWorkflow.connections.length
    });

    // 8. Find webhook trigger node
    const webhookNode = serverWorkflow.nodes.find(
      (n: any) => n.type === 'webhook_trigger' && n.config?.webhookId === webhookId
    );

    if (!webhookNode) {
      console.error('[Webhook:Prod] Webhook trigger node not found in workflow');
      console.error('[Webhook:Prod] Looking for webhookId:', webhookId);
      console.error('[Webhook:Prod] Available webhook nodes:',
        serverWorkflow.nodes
          .filter((n: any) => n.type === 'webhook_trigger')
          .map((n: any) => ({ id: n.id, type: n.type, webhookId: n.config?.webhookId }))
      );
      return NextResponse.json(
        { error: 'Webhook trigger node not found' },
        { status: 404 }
      );
    }

    console.log('[Webhook:Prod] Found webhook node:', webhookNode.id);

    // 9. Execute workflow in background using ServerWorkflowExecutor
    // Don't await - return response immediately
    const executor = new ServerWorkflowExecutor(serverWorkflow, {
      onEvent: (event: any) => {
        // Save events to SQLite for tracking
        try {
          if (event.type === 'workflow_start') {
            executionEvents.create({
              executionId,
              eventType: 'workflow_start',
              data: event
            });
          } else if (event.type === 'node_start') {
            executionEvents.create({
              executionId,
              eventType: 'node_start',
              nodeId: event.nodeId,
              data: event
            });
          } else if (event.type === 'node_end') {
            executionEvents.create({
              executionId,
              eventType: 'node_end',
              nodeId: event.nodeId,
              data: event
            });
          } else if (event.type === 'edge_traverse') {
            executionEvents.create({
              executionId,
              eventType: 'edge_traverse',
              edgeId: event.edgeId,
              data: event
            });
          } else if (event.type === 'workflow_end') {
            executionEvents.create({
              executionId,
              eventType: 'workflow_end',
              data: event
            });
          }
        } catch (err) {
          console.error('[Webhook:Prod] Failed to save event:', err);
        }
      },
      services: { db: clientDb, user: { uid: webhook.user_id }, doc, getDoc }
    });

    // Execute workflow without blocking the response
    executor.execute(webhookNode.id, webhookData).catch((err) => {
      console.error('[Webhook:Prod] Workflow execution failed:', err);
    });

    console.log('[Webhook:Prod] Workflow execution started in background');

    // 10. Return immediate response
    // TODO: Get response configuration from webhook node config
    return NextResponse.json({
      status: 'ok',
      message: 'Workflow execution started',
      executionId,
      workflowId: webhook.workflow_id
    });

  } catch (error) {
    console.error('[Webhook:Prod] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Export all HTTP method handlers
export const GET = handleWebhookRequest;
export const POST = handleWebhookRequest;
export const PUT = handleWebhookRequest;
export const DELETE = handleWebhookRequest;
export const PATCH = handleWebhookRequest;
