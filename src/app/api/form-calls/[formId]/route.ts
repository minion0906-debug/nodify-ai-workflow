import { NextRequest, NextResponse } from 'next/server';
import { formCalls } from '@/lib/db/sqlite';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  const limit = Number(request.nextUrl.searchParams.get('limit') || 50);

  try {
    const calls = formCalls.getByFormId(formId, limit);
    return NextResponse.json({ calls });
  } catch (error) {
    console.error('[API:FormCalls] Error fetching form calls:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form calls', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  const callId = Number(request.nextUrl.searchParams.get('callId'));

  if (!callId) {
    return NextResponse.json({ error: 'Missing callId parameter' }, { status: 400 });
  }

  try {
    formCalls.delete(callId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API:FormCalls] Error deleting form call:', error);
    return NextResponse.json(
      { error: 'Failed to delete form call', details: String(error) },
      { status: 500 }
    );
  }
}
