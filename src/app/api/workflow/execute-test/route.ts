import { NextRequest, NextResponse } from 'next/server';
import { executionEvents } from '@/lib/db/sqlite';
import { randomBytes } from 'crypto';

/**
 * API Route to execute a workflow in test mode with event tracking
 * POST /api/workflow/execute-test
 * Body: { workflowId, userId, webhookData }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, userId, webhookData } = body;

    if (!workflowId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: workflowId, userId' },
        { status: 400 }
      );
    }

    // Generate execution ID
    const executionId = `exec_test_${Date.now()}_${randomBytes(8).toString('hex')}`;

    console.log(`[API:ExecuteTest] Starting test execution: ${executionId} for workflow ${workflowId}`);

    // Create initial event
    executionEvents.create({
      executionId,
      eventType: 'workflow_start',
      data: {
        workflowId,
        userId,
        webhookData,
        timestamp: Date.now()
      }
    });

    // Return execution ID immediately
    // The actual execution will be handled by the WorkflowEngine in the frontend
    // or we can implement server-side execution here

    return NextResponse.json({
      success: true,
      executionId,
      message: 'Test execution started'
    });
  } catch (error) {
    console.error('[API:ExecuteTest] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start test execution', details: String(error) },
      { status: 500 }
    );
  }
}
