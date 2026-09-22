import { NextRequest, NextResponse } from 'next/server';
import { formRegistry } from '@/lib/db/sqlite';

/**
 * API Route for managing form registrations in SQLite
 * POST /api/forms - Register/Update form
 * DELETE /api/forms - Delete form
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formId, userId, workflowId, status } = body;

    if (!formId || !userId || !workflowId) {
      return NextResponse.json(
        { error: 'Missing required fields: formId, userId, workflowId' },
        { status: 400 }
      );
    }

    formRegistry.upsert(formId, {
      userId,
      workflowId,
      status: status || 'draft',
    });

    console.log(`[API:Forms] Registered form: ${formId} -> ${workflowId}`);

    return NextResponse.json({
      success: true,
      message: 'Form registered successfully',
    });
  } catch (error) {
    console.error('[API:Forms] Error registering form:', error);
    return NextResponse.json(
      { error: 'Failed to register form', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json(
        { error: 'Missing formId parameter' },
        { status: 400 }
      );
    }

    formRegistry.delete(formId);

    console.log(`[API:Forms] Deleted form: ${formId}`);

    return NextResponse.json({
      success: true,
      message: 'Form deleted successfully',
    });
  } catch (error) {
    console.error('[API:Forms] Error deleting form:', error);
    return NextResponse.json(
      { error: 'Failed to delete form', details: String(error) },
      { status: 500 }
    );
  }
}
