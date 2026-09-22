import { NextRequest, NextResponse } from 'next/server';
import { executionEvents } from '@/lib/db/sqlite';

/**
 * API Route to get execution events for real-time visualization
 * GET /api/workflow/execution-events/[executionId]?sinceId=123
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await context.params;
    const { searchParams } = new URL(request.url);
    const sinceId = searchParams.get('sinceId');

    let events;
    if (sinceId) {
      // Get only new events since last poll (by ID, not timestamp)
      const allEvents = executionEvents.getByExecutionId(executionId);
      events = allEvents.filter((e: any) => e.id > parseInt(sinceId));
    } else {
      // Get all events
      events = executionEvents.getByExecutionId(executionId);
    }

    return NextResponse.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('[API:ExecutionEvents] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution events', details: String(error) },
      { status: 500 }
    );
  }
}
