import { NextRequest, NextResponse } from 'next/server';
import { chatRegistry, chatMessages, workflowExecutions, executionEvents } from '@/lib/db/sqlite';
import { randomBytes } from 'crypto';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { ServerWorkflowExecutor } from '@/lib/server-workflow-executor';

// Initialize Firebase Client SDK for server-side usage
let clientDb: any = null;

if (!getApps().length) {
  const app = initializeApp(firebaseConfig);
  clientDb = getFirestore(app);
} else {
  const app = getApps()[0];
  clientDb = getFirestore(app);
}

interface ChatRequest {
  message: string;
  sessionId?: string;
  userId?: string;
  metadata?: any;
}

/**
 * Production Chat Handler
 * Only executes workflows that are ACTIVE
 */
async function handleChatRequest(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params;

  console.log(`[Chat:Prod] Received message for chatId: ${chatId}`);

  try {
    // 1. Fast lookup from SQLite
    const chat = chatRegistry.getById(chatId);

    if (!chat) {
      console.log('[Chat:Prod] Chat not found:', chatId);
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    console.log('[Chat:Prod] Found chat:', {
      workflowId: chat.workflow_id,
      userId: chat.user_id,
      status: chat.status
    });

    // 2. Check if workflow is active
    if (chat.status !== 'active') {
      console.log('[Chat:Prod] Workflow is not active, rejecting request');
      return NextResponse.json(
        { error: 'Chat is not active' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body: ChatRequest = await request.json();
    const {
      message,
      sessionId: bodySessionId,
      userId = 'anonymous',
      metadata: bodyMetadata = {}
    } = body;
    const metadata = { ...bodyMetadata, persistedByAPI: true, mode: 'production' };
    // Mantener la misma sesión entre mensajes si el cliente no envía una
    const sessionId = bodySessionId || 'default';

    if (!message || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('[Chat:Prod] Message:', message);
    console.log('[Chat:Prod] Session:', sessionId);
    console.log('[Chat:Prod] User:', userId);

    // 4. Load previous messages for memory (before saving current)
    let history = { agent: [] as string[], user: [] as string[] };
    try {
      const prior = chatMessages.getBySession(chatId, sessionId, 200);
      for (const m of prior) {
        if (m.role === 'user') history.user.push(String(m.content ?? ''));
        else if (m.role === 'assistant') history.agent.push(String(m.content ?? ''));
      }
      console.log(`[Chat:Prod] Memory preload -> user:${history.user.length} agent:${history.agent.length}`);
    } catch (e) {
      console.warn('[Chat:Prod] Failed to load prior messages for memory:', e);
    }

    // 5. Save user message
    const userMessageId = `msg_${Date.now()}_${randomBytes(4).toString('hex')}`;
    chatMessages.create({
      chatId,
      sessionId,
      messageId: userMessageId,
      role: 'user',
      content: message,
      mode: 'production',
      metadata: { ...metadata, userId }
    });

    // 5. Fetch workflow data from Firestore
    const workflowRef = doc(clientDb, 'users', chat.user_id, 'workflows', chat.workflow_id);
    const workflowSnap = await getDoc(workflowRef);

    if (!workflowSnap.exists()) {
      console.error('[Chat:Prod] Workflow document not found in Firestore');
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const workflowData = workflowSnap.data();
    const serverWorkflow = {
      id: chat.workflow_id,
      name: workflowData.name || 'Unnamed Workflow',
      status: workflowData.status || 'active',
      nodes: workflowData.nodes || [],
      connections: workflowData.connections || []
    };

    console.log('[Chat:Prod] Fetched workflow:', {
      id: serverWorkflow.id,
      name: serverWorkflow.name,
      nodeCount: serverWorkflow.nodes.length,
      connectionCount: serverWorkflow.connections.length
    });

    // 6. Find chat trigger node
    const chatNode = serverWorkflow.nodes.find(
      (n: any) => n.type === 'chat_trigger' && n.config?.chatId === chatId
    );

    if (!chatNode) {
      console.error('[Chat:Prod] Chat trigger node not found in workflow');
      return NextResponse.json(
        { error: 'Chat trigger node not found' },
        { status: 404 }
      );
    }

    console.log('[Chat:Prod] Found chat node:', chatNode.id);

    // 7. Create execution record
    const executionId = `exec_${Date.now()}_${randomBytes(8).toString('hex')}`;

    workflowExecutions.create({
      id: executionId,
      workflowId: chat.workflow_id,
      userId: chat.user_id,
      mode: 'production',
      trigger: 'chat',
      webhookData: {
        message,
        sessionId,
        userId,
        timestamp: new Date().toISOString(),
        metadata
      }
    });

    console.log('[Chat:Prod] Created execution:', executionId);

    // 8. Execute workflow and wait for response
    const executor = new ServerWorkflowExecutor(serverWorkflow, {
      onEvent: (event: any) => {
        try {
          if (event.type === 'workflow_start') {
            executionEvents.create({
              executionId,
              eventType: 'workflow_start',
              data: event
            });
          } else if (event.type === 'node_start') {
            executionEvents.create({
              executionId,
              eventType: 'node_start',
              nodeId: event.nodeId,
              data: event
            });
          } else if (event.type === 'node_end') {
            executionEvents.create({
              executionId,
              eventType: 'node_end',
              nodeId: event.nodeId,
              data: event
            });
          } else if (event.type === 'edge_traverse') {
            executionEvents.create({
              executionId,
              eventType: 'edge_traverse',
              edgeId: event.edgeId,
              data: event
            });
          } else if (event.type === 'workflow_end') {
            executionEvents.create({
              executionId,
              eventType: 'workflow_end',
              data: event
            });
          }
        } catch (err) {
          console.error('[Chat:Prod] Failed to save event:', err);
        }
      },
      services: { db: clientDb, user: { uid: chat.user_id }, doc, getDoc }
    });

    // Execute workflow and WAIT for result (synchronous for chat)
    const chatData = {
      message,
      sessionId,
      userId,
      timestamp: new Date().toISOString(),
      metadata,
      history,
      chat: { id: chatId, mode: 'production' }
    };

    console.log('[Chat:Prod] Executing workflow...');
    const executionContext = await executor.execute(chatNode.id, chatData);
    console.log('[Chat:Prod] Workflow execution completed');
    console.log('[Chat:Prod] Execution context keys:', Object.keys(executionContext));

    // Find the last executed node (excluding the chat trigger itself)
    const executedNodeIds = Object.keys(executionContext).filter(id => id !== chatNode.id);
    console.log('[Chat:Prod] Executed nodes (excluding trigger):', executedNodeIds);

    let result: any = null;
    if (executedNodeIds.length > 0) {
      // Get the output of the last node
      const lastNodeId = executedNodeIds[executedNodeIds.length - 1];
      result = executionContext[lastNodeId]?.output;
      console.log('[Chat:Prod] Last node ID:', lastNodeId);
      console.log('[Chat:Prod] Last node output:', JSON.stringify(result, null, 2));
    } else {
      // No nodes after chat trigger, use chat trigger output
      result = executionContext[chatNode.id]?.output;
      console.log('[Chat:Prod] No nodes after chat trigger, using trigger output');
    }

    // 9. Extract response from the last node's output
    let responseContent = 'No response generated';

    if (!result) {
      console.warn('[Chat:Prod] No output from workflow execution');
      responseContent = 'Workflow executed but no output was generated';
    } else {
      // Try to get response from common output fields
      if (result?.message) {
        responseContent = result.message;
      } else if (result?.response) {
        responseContent = result.response;
      } else if (result?.text) {
        responseContent = result.text;
      } else if (result?.data?.message) {
        responseContent = result.data.message;
      } else if (result?.data?.response) {
        responseContent = result.data.response;
      } else if (result?.data?.text) {
        responseContent = result.data.text;
      } else if (typeof result === 'string') {
        responseContent = result;
      } else if (result) {
        // If result is an object, stringify it
        responseContent = JSON.stringify(result, null, 2);
      }
    }

    console.log('[Chat:Prod] Response content:', responseContent);

    // 10. Save assistant message
    const assistantMessageId = `msg_${Date.now()}_${randomBytes(4).toString('hex')}`;
    chatMessages.create({
      chatId,
      sessionId,
      messageId: assistantMessageId,
      role: 'assistant',
      content: responseContent,
      mode: 'production',
      executionId,
      metadata: { result }
    });

    // 11. Return response
    return NextResponse.json({
      success: true,
      message: responseContent,
      messageId: assistantMessageId,
      executionId,
      sessionId,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[Chat:Prod] Error processing chat message:', error);

    // Save error message as assistant response
    try {
      const errorMessageId = `msg_${Date.now()}_${randomBytes(4).toString('hex')}`;
      const errorContent = 'Sorry, I encountered an error processing your message. Please try again.';

      chatMessages.create({
        chatId,
        sessionId: 'error',
        messageId: errorMessageId,
        role: 'assistant',
        content: errorContent,
        mode: 'production',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    } catch (e) {
      console.error('[Chat:Prod] Failed to save error message:', e);
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Sorry, I encountered an error processing your message. Please try again.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// POST endpoint for chat messages
export const POST = handleChatRequest;

// GET endpoint to retrieve chat history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  try {
    const chat = chatRegistry.getById(chatId);

    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Get messages for this session
    let messages;
    if (sessionId) {
      messages = chatMessages.getBySession(chatId, sessionId);
    } else {
      // If no session ID, return empty (don't expose all sessions in prod)
      messages = [];
    }

    return NextResponse.json({
      success: true,
      chatId,
      sessionId: sessionId || null,
      messages: messages.map(m => ({
        id: m.message_id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp * 1000 // Convert to milliseconds
      }))
    });
  } catch (error) {
    console.error('[Chat:Prod] Error retrieving chat history:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
