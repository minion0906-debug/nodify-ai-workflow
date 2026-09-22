import { NextRequest, NextResponse } from 'next/server';
import { chatRegistry } from '@/lib/db/sqlite';

/**
 * API Route for managing chat registrations in SQLite
 * POST /api/chats - Register/Update chat
 * DELETE /api/chats - Delete chat
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, userId, workflowId, status } = body;

    if (!chatId || !userId || !workflowId) {
      return NextResponse.json(
        { error: 'Missing required fields: chatId, userId, workflowId' },
        { status: 400 }
      );
    }

    chatRegistry.upsert(chatId, {
      userId,
      workflowId,
      status: status || 'draft',
    });

    console.log(`[API:Chats] Registered chat: ${chatId} -> ${workflowId}`);

    return NextResponse.json({
      success: true,
      message: 'Chat registered successfully',
    });
  } catch (error) {
    console.error('[API:Chats] Error registering chat:', error);
    return NextResponse.json(
      { error: 'Failed to register chat', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json(
        { error: 'Missing chatId parameter' },
        { status: 400 }
      );
    }

    chatRegistry.delete(chatId);

    console.log(`[API:Chats] Deleted chat: ${chatId}`);

    return NextResponse.json({
      success: true,
      message: 'Chat deleted successfully',
    });
  } catch (error) {
    console.error('[API:Chats] Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat', details: String(error) },
      { status: 500 }
    );
  }
}
