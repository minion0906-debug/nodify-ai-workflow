import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { whatsappRegistry, whatsappCalls, workflowExecutions, executionEvents } from '@/lib/db/sqlite';
import { randomBytes, createHmac } from 'crypto';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { ServerWorkflowExecutor } from '@/lib/server-workflow-executor';

// Firebase client for reading workflow documents
let clientDb: any = null;
if (!getApps().length) {
  const app = initializeApp(firebaseConfig);
  clientDb = getFirestore(app);
} else {
  const app = getApps()[0];
  clientDb = getFirestore(app);
}

function verifySignature(appSecret: string | null | undefined, signature: string | null, payload: string): boolean {
  if (!appSecret || !signature) return true; // Si no hay secret, omitir validación
  try {
    const expected =
      'sha256=' + createHmac('sha256', appSecret).update(payload, 'utf8').digest('hex');
    // Comparación de tiempo constante básica
    return expected.length === signature.length &&
      cryptoSafeCompare(expected, signature);
  } catch {
    return false;
  }
}

function cryptoSafeCompare(a: string, b: string): boolean {
  let mismatch = a.length === b.length ? 0 : 1;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0 && a.length === b.length;
}

async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ whatsappId: string }> }
) {
  const { whatsappId } = await params;
  const method = request.method;
  const url = new URL(request.url);

  // Lookup de registro
  const reg = whatsappRegistry.getById(whatsappId);
  if (!reg) {
    return NextResponse.json({ error: 'WhatsApp ID no encontrado' }, { status: 404 });
  }

  // Verificación (GET)
  if (method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token && challenge && token === (reg.verify_token || '')) {
      return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return NextResponse.json({ error: 'Verificación fallida' }, { status: 403 });
  }

  // Parseo de headers y query
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => (headers[k] = v));
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (query[k] = v));

  // WhatsApp envía firma en X-Hub-Signature-256
  const signature = request.headers.get('x-hub-signature-256');
  const rawBodyText = await request.text();
  let body: any = null;
  try { body = rawBodyText ? JSON.parse(rawBodyText) : null; } catch { body = null; }

  // Log de llamada
  whatsappCalls.create({
    whatsappId,
    mode: 'production',
    body,
    query,
    headers,
    path: url.pathname,
  });

  // Validar firma si hay secret
  if (!verifySignature(reg.app_secret || undefined, signature, rawBodyText)) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  // Solo ejecutar si workflow está ACTIVO
  if (reg.status !== 'active') {
    return NextResponse.json({ status: 'ok', message: 'Recibido. Workflow inactivo.' });
  }

  // Crear ejecución
  const executionId = `exec_${Date.now()}_${randomBytes(8).toString('hex')}`;
  const webhookData = { body, query, headers, method, path: url.pathname };
  workflowExecutions.create({
    id: executionId,
    workflowId: reg.workflow_id,
    userId: reg.user_id,
    webhookId: whatsappId,
    mode: 'production',
    trigger: 'whatsapp',
    webhookData,
  });

  // Cargar workflow
  const workflowRef = doc(clientDb, 'users', reg.user_id, 'workflows', reg.workflow_id);
  const snap = await getDoc(workflowRef);
  if (!snap.exists()) {
    return NextResponse.json({ error: 'Workflow no encontrado' }, { status: 404 });
  }

  const wf = snap.data();
  const serverWorkflow = {
    id: reg.workflow_id,
    name: wf.name || 'Unnamed Workflow',
    status: wf.status || 'active',
    nodes: wf.nodes || [],
    connections: wf.connections || [],
  };

  // Buscar nodo trigger de WhatsApp
  const triggerNode = serverWorkflow.nodes.find(
    (n: any) => n.type === 'whatsapp_trigger' && n.config?.whatsappId === whatsappId
  );
  if (!triggerNode) {
    return NextResponse.json({ error: 'Nodo whatsapp_trigger no encontrado' }, { status: 404 });
  }

  // Ejecutar en background
  const executor = new ServerWorkflowExecutor(serverWorkflow, {
    onEvent: (event: any) => {
      try {
        if (event.type === 'workflow_start') {
          executionEvents.create({ executionId, eventType: 'workflow_start', data: event });
        } else if (event.type === 'node_start') {
          executionEvents.create({ executionId, eventType: 'node_start', nodeId: event.nodeId, data: event });
        } else if (event.type === 'node_end') {
          executionEvents.create({ executionId, eventType: 'node_end', nodeId: event.nodeId, data: event });
        } else if (event.type === 'edge_traverse') {
          executionEvents.create({ executionId, eventType: 'edge_traverse', edgeId: event.edgeId, data: event });
        } else if (event.type === 'workflow_end') {
          executionEvents.create({ executionId, eventType: 'workflow_end', data: event });
        }
      } catch {}
    },
    services: { db: clientDb, user: { uid: reg.user_id }, doc, getDoc },
  });

  executor.execute(triggerNode.id, webhookData).catch((err) => {
    console.error('[WhatsApp:Prod] Execution error:', err);
  });

  return NextResponse.json({ status: 'ok', message: 'Ejecución iniciada', executionId });
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest; // por compatibilidad
export const DELETE = handleRequest;
export const PATCH = handleRequest;
