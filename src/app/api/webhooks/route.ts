import { NextRequest, NextResponse } from 'next/server';
import { webhookRegistry } from '@/lib/db/sqlite';

/**
 * API Route for managing webhook registrations in SQLite
 * POST /api/webhooks - Register/Update webhook
 * DELETE /api/webhooks - Delete webhook
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookId, userId, workflowId, method, status } = body;

    if (!webhookId || !userId || !workflowId) {
      return NextResponse.json(
        { error: 'Missing required fields: webhookId, userId, workflowId' },
        { status: 400 }
      );
    }

    webhookRegistry.upsert(webhookId, {
      userId,
      workflowId,
      method: method || 'POST',
      status: status || 'draft',
    });

    console.log(`[API:Webhooks] Registered webhook: ${webhookId} -> ${workflowId} (${method})`);

    return NextResponse.json({
      success: true,
      message: 'Webhook registered successfully',
    });
  } catch (error) {
    console.error('[API:Webhooks] Error registering webhook:', error);
    return NextResponse.json(
      { error: 'Failed to register webhook', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('webhookId');

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Missing webhookId parameter' },
        { status: 400 }
      );
    }

    webhookRegistry.delete(webhookId);

    console.log(`[API:Webhooks] Deleted webhook: ${webhookId}`);

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('[API:Webhooks] Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook', details: String(error) },
      { status: 500 }
    );
  }
}
