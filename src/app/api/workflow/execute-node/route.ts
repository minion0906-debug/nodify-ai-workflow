import { NextRequest, NextResponse } from 'next/server';
import { getNodeDefinition } from '@/lib/nodes';
import { getFirebaseAdmin } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

async function verifyUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    const { auth } = getFirebaseAdmin();
    const decoded = await auth.verifyIdToken(token);
    return decoded;
  } catch (e) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { node, inputData, executionContext } = body;

    if (!node) {
      return NextResponse.json({ error: 'Node data is required' }, { status: 400 });
    }

    const definition = getNodeDefinition(node.type);
    if (!definition) {
      return NextResponse.json({ error: `No definition for node type '${node.type}'` }, { status: 404 });
    }

    if (!definition.executionCode) {
      // Pass-through node - return input as output with logs
      const logs = [
        {
          timestamp: new Date(),
          type: 'info' as const,
          message: `Pass-through node (no execution code)`,
          args: []
        }
      ];
      return NextResponse.json({
        output: inputData,
        logs
      });
    }

    // For server-side execution, we don't have access to browser APIs
    // Build execution context and provide minimal services for credential access
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

    let executor;
    try {
      executor = new AsyncFunction(
        'node',
        'data',
        'items',
        'execution',
        '$',
        '$input',
        '$json',
        '$node',
        'helpers',
        'services',
        'env',
        'require',
        'modules',
        definition.executionCode
      );
    } catch (syntaxError) {
      console.error(`[API:execute-node] Syntax error in node '${node.type}':`, syntaxError);
      console.error('Execution code:', definition.executionCode);
      throw new Error(`Syntax error in ${definition.name} (${node.type}): ${syntaxError.message}`);
    }

    const items = Array.isArray(inputData) ? inputData : (inputData ? [inputData] : []);
    const $input = {
      first: () => items[0] || {},
      last: () => items[items.length - 1] || {},
      all: () => items,
      item: (index: number) => items[index] || {},
    };

    // Capture logs for debugging
    const logs: Array<{ timestamp: Date; type: 'log' | 'error' | 'warn' | 'info'; message: string; args?: any[] }> = [];

    // Add start log
    logs.push({
      timestamp: new Date(),
      type: 'info',
      message: `Starting execution of ${definition.name}`,
      args: []
    });

    let helpers: any = {
      json: (obj: any) => JSON.stringify(obj, null, 2),
      parse: (str: string) => JSON.parse(str),
      log: (...args: any[]) => {
        const message = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        logs.push({
          timestamp: new Date(),
          type: 'log',
          message,
          args
        });
        console.log(`[${definition.name}]`, ...args);
      },
      error: (...args: any[]) => {
        const message = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        logs.push({
          timestamp: new Date(),
          type: 'error',
          message,
          args
        });
        console.error(`[${definition.name}]`, ...args);
      },
      warn: (...args: any[]) => {
        const message = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        logs.push({
          timestamp: new Date(),
          type: 'warn',
          message,
          args
        });
        console.warn(`[${definition.name}]`, ...args);
      },
    };

    // Provide Node.js modules for server-side execution
    const dynamicRequire = eval('require');
    const nodeModules = {
      fs: dynamicRequire('fs'),
      path: dynamicRequire('path'),
      crypto: dynamicRequire('crypto'),
      buffer: dynamicRequire('buffer'),
      stream: dynamicRequire('stream'),
    };

    // Build services (Firestore Admin access) when authorized
    let services: any = null;
    const decodedUser = await verifyUser(request);
    if (decodedUser) {
      const { db: adminDb } = getFirebaseAdmin();

      // Minimal shim to support services.doc/services.getDoc used in nodes
      const docShim = (_db: any, ...segments: string[]) => ({ segments });
      const getDocShim = async (ref: any) => {
        const segments: string[] = ref?.segments || [];
        if (segments.length === 0) throw new Error('Invalid document reference');
        const path = segments.join('/');
        return await adminDb.doc(path).get();
      };

      services = {
        db: adminDb,
        user: { uid: decodedUser.uid },
        doc: docShim,
        getDoc: getDocShim,
        updateDoc: async (ref: any, data: any) => {
          const segments: string[] = ref?.segments || [];
          if (segments.length === 0) throw new Error('Invalid document reference');
          const path = segments.join('/');
          await adminDb.doc(path).update(data);
        },
        incrementApiCalls: async (count: number = 1) => {
          try {
            await adminDb.doc(`users/${decodedUser.uid}`).update({ 'usage.apiCallsThisMonth': FieldValue.increment(count) });
          } catch (e) {
            /* noop */
          }
        },
      } as any;

      // Add credential helpers
      helpers.getCredential = async (credentialId: string) => {
        try {
          const snap = await services.getDoc(
            services.doc(services.db, 'users', services.user.uid, 'credentials', credentialId)
          );
          const exists = typeof (snap as any)?.exists === 'function' ? (snap as any).exists() : !!(snap as any)?.exists;
          if (!exists) return null;
          const data = snap.data();
          return { id: snap.id, ...data };
        } catch (e: any) {
          helpers.error('getCredential failed:', e?.message || e);
          return null;
        }
      };
      helpers.getCredentialData = async (credentialId: string) => {
        const cred = await helpers.getCredential(credentialId);
        return cred?.data || null;
      };
    }

    const startTime = Date.now();
    const output = await executor(
      node,
      items[0] || {},
      items,
      executionContext,
      executionContext,
      $input,
      items[0] || {},
      node,
      helpers,
      services,
      process.env,
      dynamicRequire, // Add require function
      nodeModules // Add preloaded modules
    );
    const duration = Date.now() - startTime;

    // Add completion log
    logs.push({
      timestamp: new Date(),
      type: 'info',
      message: `Execution completed successfully in ${duration}ms`,
      args: []
    });

    // Increment API calls metric for networked nodes
    try {
      const apiNodes = new Set([
        'http_request',
        'openai_chat',
        'ai_text_generation',
        'tmpfiles_upload',
        'sendgrid_send_email',
        'twilio_send_message',
        'telegram_send_message',
        'discord_send_message',
        'slack_message',
        'stripe_create_payment_intent',
        'github_issue_comment',
        'notion_create_page',
        'airtable_record',
        'google_drive_create_file',
        'google_calendar_create_event',
        'google_sheets',
        'send_email'
      ]);
      if (services && (services as any).incrementApiCalls && (apiNodes as any).has(node.type)) {
        await (services as any).incrementApiCalls(1);
      }
    } catch {}

    return NextResponse.json({
      output,
      logs
    });
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred';
    const errorStack = (error instanceof Error) ? error.stack : undefined;
    console.error('[API:execute-node] Error:', error);

    // Add error logs if logs array exists
    const errorLogs: Array<{ timestamp: Date; type: 'log' | 'error' | 'warn' | 'info'; message: string; args?: any[] }> = [];
    errorLogs.push({
      timestamp: new Date(),
      type: 'error',
      message: `Execution failed: ${errorMessage}`,
      args: [error]
    });
    if (errorStack) {
      errorLogs.push({
        timestamp: new Date(),
        type: 'error',
        message: `Stack trace:\n${errorStack}`,
        args: []
      });
    }

    return NextResponse.json({
      output: { error: 'Failed to execute node', details: errorMessage },
      logs: errorLogs
    }, { status: 500 });
  }
}
