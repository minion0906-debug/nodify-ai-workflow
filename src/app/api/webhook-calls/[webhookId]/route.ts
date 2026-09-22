import { NextRequest, NextResponse } from 'next/server';
import { webhookCalls } from '@/lib/db/sqlite';
import Database from 'better-sqlite3';
import path from 'path';

/**
 * API Route to get recent webhook calls for a webhook
 * GET /api/webhook-calls/[webhookId]?limit=10
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { webhookId: string } }
) {
  try {
    const { webhookId } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const calls = webhookCalls.getByWebhookId(webhookId, limit);

    return NextResponse.json({
      success: true,
      calls
    });
  } catch (error) {
    console.error('[API:WebhookCalls] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook calls', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/webhook-calls/[webhookId]?callId=123
 * Delete a specific webhook call after it has been processed
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { webhookId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');

    if (!callId) {
      return NextResponse.json(
        { error: 'Missing callId parameter' },
        { status: 400 }
      );
    }

    // Delete the webhook call
    const dataDir = path.join(process.cwd(), 'data');
    const dbPath = path.join(dataDir, 'nodify.db');
    const db = new Database(dbPath);

    const stmt = db.prepare('DELETE FROM webhook_calls WHERE id = ?');
    stmt.run(callId);

    console.log(`[API:WebhookCalls] Deleted webhook call: ${callId}`);

    return NextResponse.json({
      success: true,
      message: 'Webhook call deleted successfully',
    });
  } catch (error) {
    console.error('[API:WebhookCalls] Error deleting webhook call:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook call', details: String(error) },
      { status: 500 }
    );
  }
}
