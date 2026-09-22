import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getFirebaseAdmin } from '@/firebase/admin';

export const runtime = 'nodejs';

async function cleanupLocalFiles() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'forms');

  try {
    const formDirs = await fs.readdir(uploadsDir);
    let deletedCount = 0;

    for (const formId of formDirs) {
      const formDir = path.join(uploadsDir, formId);
      const stat = await fs.stat(formDir);

      if (!stat.isDirectory()) continue;

      const files = await fs.readdir(formDir);

      for (const file of files) {
        // Skip metadata files
        if (file.endsWith('.meta.json')) continue;

        const filePath = path.join(formDir, file);
        const metaPath = filePath + '.meta.json';

        try {
          // Check if metadata exists
          const metaContent = await fs.readFile(metaPath, 'utf-8');
          const metadata = JSON.parse(metaContent);

          // Check if file is expired
          if (Date.now() > metadata.expiresAt) {
            // Delete file and metadata
            await fs.unlink(filePath);
            await fs.unlink(metaPath);
            deletedCount++;
            console.log(`[Cleanup] Deleted expired file: ${filePath}`);
          }
        } catch (e) {
          // If no metadata, delete files older than 12 hours
          const filestat = await fs.stat(filePath);
          const age = Date.now() - filestat.mtimeMs;
          const maxAge = 12 * 60 * 60 * 1000; // 12 hours

          if (age > maxAge) {
            await fs.unlink(filePath);
            deletedCount++;
            console.log(`[Cleanup] Deleted old file without metadata: ${filePath}`);
          }
        }
      }

      // Remove empty directories
      const remainingFiles = await fs.readdir(formDir);
      if (remainingFiles.length === 0) {
        await fs.rmdir(formDir);
        console.log(`[Cleanup] Removed empty directory: ${formDir}`);
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('[Cleanup] Error cleaning local files:', error);
    return 0;
  }
}

async function cleanupFirebaseFiles() {
  try {
    const { storage } = getFirebaseAdmin();
    const bucket = storage.bucket();

    const [files] = await bucket.getFiles({ prefix: 'forms/' });
    let deletedCount = 0;

    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const expiresAt = metadata.metadata?.expiresAt;

      if (expiresAt && Date.now() > parseInt(expiresAt)) {
        await file.delete();
        deletedCount++;
        console.log(`[Cleanup] Deleted expired Firebase file: ${file.name}`);
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('[Cleanup] Error cleaning Firebase files:', error);
    return 0;
  }
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'nodify-cron-secret-change-in-production';

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cleanup] Starting expired files cleanup...');

  const localDeleted = await cleanupLocalFiles();
  const cloudDeleted = await cleanupFirebaseFiles();

  console.log(`[Cleanup] Cleanup complete. Local: ${localDeleted}, Cloud: ${cloudDeleted}`);

  return NextResponse.json({
    success: true,
    deleted: {
      local: localDeleted,
      cloud: cloudDeleted,
      total: localDeleted + cloudDeleted
    },
    timestamp: new Date().toISOString()
  });
}
