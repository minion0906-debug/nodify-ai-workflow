import { NextRequest, NextResponse } from 'next/server';
import { webhookRegistry, webhookCalls } from '@/lib/db/sqlite';

interface WebhookData {
  body: any;
  query: Record<string, string>;
  headers: Record<string, string>;
  method: string;
  path: string;
}

/**
 * Test Webhook Handler - SQLite Version
 * Captures data for testing WITHOUT executing the workflow
 * Works with any workflow status (active, inactive, draft)
 */
async function handleTestWebhookRequest(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  const { webhookId } = await params;
  const method = request.method;

  console.log(`[Webhook:Test] Received ${method} request for webhookId: ${webhookId}`);

  try {
    // 1. Fast lookup from SQLite (O(1) with index)
    const webhook = webhookRegistry.getById(webhookId);

    if (!webhook) {
      console.log('[Webhook:Test] Webhook not found:', webhookId);
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // 2. Verify HTTP method matches
    if (webhook.method !== method) {
      console.log(`[Webhook:Test] Method mismatch. Expected: ${webhook.method}, Got: ${method}`);
      return NextResponse.json(
        { error: `Method not allowed. This webhook expects ${webhook.method}` },
        { status: 405 }
      );
    }

    console.log('[Webhook:Test] Found webhook:', {
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
        console.warn('[Webhook:Test] Failed to parse body:', error);
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

    console.log('[Webhook:Test] Parsed data:', JSON.stringify(webhookData, null, 2));

    // 4. Save test webhook call to SQLite
    webhookCalls.create({
      webhookId,
      mode: 'test',
      method,
      body,
      query,
      headers,
      path: url.pathname,
      workflowStatus: webhook.status
    });

    console.log('[Webhook:Test] Saved test data to SQLite');

    // 5. TEST MODE: Never execute workflow, just capture and return
    // In test mode, we return the captured data for debugging
    return NextResponse.json({
      status: 'ok',
      message: 'Test webhook received',
      mode: 'test',
      _testMode: true,
      _capturedData: webhookData,
      _webhook: {
        id: webhook.webhook_id,
        workflowId: webhook.workflow_id,
        status: webhook.status
      }
    });

  } catch (error) {
    console.error('[Webhook:Test] Error processing test webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Export all HTTP method handlers
export const GET = handleTestWebhookRequest;
export const POST = handleTestWebhookRequest;
export const PUT = handleTestWebhookRequest;
export const DELETE = handleTestWebhookRequest;
export const PATCH = handleTestWebhookRequest;
