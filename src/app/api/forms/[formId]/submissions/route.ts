import { NextRequest, NextResponse } from 'next/server';
import { formCalls } from '@/lib/db/sqlite';

export async function GET(
  request: NextRequest,
  { params }: { params: { formId: string } }
) {
  try {
    const { formId } = params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');

    const submissions = formCalls.getByFormId(formId, limit ? parseInt(limit) : 50);

    return NextResponse.json(submissions);
  } catch (error) {
    console.error('[Submissions API] Error fetching form submissions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
