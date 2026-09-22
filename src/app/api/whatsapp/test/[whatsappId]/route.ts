import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { whatsappRegistry, whatsappCalls } from '@/lib/db/sqlite';

async function handleTest(
  request: NextRequest,
  { params }: { params: Promise<{ whatsappId: string }> }
) {
  const { whatsappId } = await params;
  const method = request.method;
  const url = new URL(request.url);

  const reg = whatsappRegistry.getById(whatsappId);
  if (!reg) {
    return NextResponse.json({ error: 'WhatsApp ID no encontrado' }, { status: 404 });
  }

  if (method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token && challenge && token === (reg.verify_token || '')) {
      return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return NextResponse.json({ error: 'Verificación fallida' }, { status: 403 });
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => (headers[k] = v));
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (query[k] = v));
  const rawBody = await request.text();
  let body: any = null;
  try { body = rawBody ? JSON.parse(rawBody) : null; } catch { body = null; }

  whatsappCalls.create({
    whatsappId,
    mode: 'test',
    body,
    query,
    headers,
    path: url.pathname,
  });

  return NextResponse.json({
    status: 'ok',
    message: 'Test webhook capturado (no ejecuta flujo)',
    _testMode: true,
    _capturedData: { body, query, headers, method, path: url.pathname },
  });
}

export const GET = handleTest;
export const POST = handleTest;
export const PUT = handleTest;
export const DELETE = handleTest;
export const PATCH = handleTest;

