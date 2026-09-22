import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { formRegistry, workflowExecutions, formCalls } from '@/lib/db/sqlite';
import { randomBytes } from 'crypto';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { ServerWorkflowExecutor } from '@/lib/server-workflow-executor';
import { getFirebaseAdmin } from '@/firebase/admin';
import fs from 'fs/promises';
import path from 'path';

// Initialize Firebase Client SDK for server-side usage
let clientDb: any = null;

if (!getApps().length) {
  const app = initializeApp(firebaseConfig);
  clientDb = getFirestore(app);
} else {
  const app = getApps()[0];
  clientDb = getFirestore(app);
}

async function handleFormSubmission(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  if (request.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const formInfo = formRegistry.getById(formId);

    if (!formInfo) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    if (formInfo.status !== 'active') {
      return NextResponse.json(
        { message: 'This form is not active.' },
        { status: 200 }
      );
    }

    // const { storage } = getFirebaseAdmin();
    // const bucket = storage.bucket();

    // Get workflow to check file upload location preference
    const workflowRef = doc(clientDb, 'users', formInfo.user_id, 'workflows', formInfo.workflow_id);
    const workflowSnap = await getDoc(workflowRef);

    if (!workflowSnap.exists()) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const workflowData = workflowSnap.data();
    const formNode = workflowData.nodes?.find(
      (n: any) => n.type === 'form_submit_trigger' && n.config?.formId === formId
    );

    const uploadLocation = formNode?.config?.fileUploadLocation || 'local';
    const expirationHours = uploadLocation === 'cloud' ? 24 : 12;

    const formData = await request.formData();
    const body: { [key: string]: any } = {};
    const files: { [key: string]: { url: string; expiresAt: number } } = {};
    const fileUploadPromises: Promise<void>[] = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const file = value as File;
        const fileArrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(fileArrayBuffer);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${safeName}`;
        const expiresAt = Date.now() + (expirationHours * 60 * 60 * 1000);

        const uploadPromise = (async () => {
          if (uploadLocation === 'cloud') {
            // Upload to Firebase Storage with 24h expiration
            try {
              const { storage } = getFirebaseAdmin();
              const bucket = storage.bucket();
              const storagePath = `forms/${formId}/${uniqueName}`;
              const fileRef = bucket.file(storagePath);

              await fileRef.save(buffer, {
                metadata: {
                  contentType: file.type || 'application/octet-stream',
                  customMetadata: {
                    expiresAt: expiresAt.toString(),
                    uploadLocation: 'cloud'
                  }
                }
              });

              // Generate signed URL with 24h expiration
              const expiresDate = new Date(expiresAt);
              const [signedUrl] = await fileRef.getSignedUrl({
                action: 'read',
                expires: expiresDate
              });

              files[key] = { url: signedUrl, expiresAt };
            } catch (e) {
              console.error('[FormSubmit] Firebase upload failed:', e);
              // Fallback to local if cloud fails
              const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'forms', formId);
              await fs.mkdir(uploadsDir, { recursive: true });
              const dest = path.join(uploadsDir, uniqueName);
              await fs.writeFile(dest, buffer);

              // Store metadata for cleanup
              const metaPath = dest + '.meta.json';
              await fs.writeFile(metaPath, JSON.stringify({
                expiresAt,
                uploadLocation: 'local-fallback',
                originalName: file.name
              }));

              files[key] = { url: `/uploads/forms/${formId}/${uniqueName}`, expiresAt };
            }
          } else {
            // Upload locally with 12h expiration
            const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'forms', formId);
            await fs.mkdir(uploadsDir, { recursive: true });
            const dest = path.join(uploadsDir, uniqueName);
            await fs.writeFile(dest, buffer);

            // Store metadata for cleanup
            const metaPath = dest + '.meta.json';
            await fs.writeFile(metaPath, JSON.stringify({
              expiresAt,
              uploadLocation: 'local',
              originalName: file.name
            }));

            files[key] = { url: `/uploads/forms/${formId}/${uniqueName}`, expiresAt };
          }
        })();

        fileUploadPromises.push(uploadPromise);
      } else {
        body[key] = value;
      }
    }

    await Promise.all(fileUploadPromises);

    formCalls.create({ formId, body, files });

    const executionId = `exec_${Date.now()}_${randomBytes(8).toString('hex')}`;

    workflowExecutions.create({
      id: executionId,
      workflowId: formInfo.workflow_id,
      userId: formInfo.user_id,
      mode: 'production',
      trigger: 'form_submit',
      webhookData: { body, files }, // Storing form data and files in webhook_data
    });

    const serverWorkflow = {
      id: formInfo.workflow_id,
      name: workflowData.name || 'Unnamed Workflow',
      status: workflowData.status || 'active',
      nodes: workflowData.nodes || [],
      connections: workflowData.connections || [],
    };

    if (!formNode) {
      return NextResponse.json(
        { error: 'Form trigger node not found in workflow' },
        { status: 404 }
      );
    }

    const executor = new ServerWorkflowExecutor(serverWorkflow, {
      services: { db: clientDb, user: { uid: formInfo.user_id }, doc, getDoc }
    });

    executor.execute(formNode.id, { body, files }).catch((err) => {
      console.error('[FormSubmit] Workflow execution failed:', err);
    });

    const { successMessage, redirectUrl } = formNode.config;

    if (redirectUrl) {
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    return NextResponse.json({ message: successMessage || 'Form submitted successfully.' });

  } catch (error) {
    console.error('[FormSubmit] Error processing form submission:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export const POST = handleFormSubmission;
