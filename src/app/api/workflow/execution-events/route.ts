import { NextRequest, NextResponse } from 'next/server';
import { executionEvents } from '@/lib/db/sqlite';

/**
 * API Route to create execution events
 * POST /api/workflow/execution-events
 * Body: { executionId, eventType, nodeId?, edgeId?, data? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { executionId, eventType, nodeId, edgeId, data } = body;

    if (!executionId || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: executionId, eventType' },
        { status: 400 }
      );
    }

    // Validate event type
    const validEventTypes = ['workflow_start', 'workflow_end', 'node_start', 'node_end', 'edge_traverse'];
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Must be one of: ${validEventTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create event
    executionEvents.create({
      executionId,
      eventType,
      nodeId,
      edgeId,
      data,
    });

    console.log(`[API:ExecutionEvents] Event created: ${eventType} for execution ${executionId}`);

    return NextResponse.json({
      success: true,
      message: 'Event created successfully',
    });
  } catch (error) {
    console.error('[API:ExecutionEvents] Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event', details: String(error) },
      { status: 500 }
    );
  }
}
