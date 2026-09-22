import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const ICONS_DIR = path.join(process.cwd(), 'public', 'assets', 'images', 'nodes');

async function ensureDir() {
  try {
    await fs.access(ICONS_DIR);
  } catch {
    await fs.mkdir(ICONS_DIR, { recursive: true });
  }
}

function sanitizeFileName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}

export async function POST(request: Request) {
  try {
    await ensureDir();
    const form = await request.formData();
    const file = form.get('file') as File | null;
    const desiredName = (form.get('filename') as string | null) || null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const originalExt = path.extname(file.name) || '.png';
    const baseName = sanitizeFileName((desiredName || path.basename(file.name, originalExt)) || 'icon');

    // Avoid overwriting existing files
    let finalName = `${baseName}${originalExt}`;
    let counter = 1;
    while (true) {
      try {
        await fs.access(path.join(ICONS_DIR, finalName));
        finalName = `${baseName}-${counter}${originalExt}`;
        counter += 1;
      } catch {
        break;
      }
    }

    const destPath = path.join(ICONS_DIR, finalName);
    await fs.writeFile(destPath, buffer);

    // Public web path
    const publicPath = `/assets/images/nodes/${finalName}`;
    return NextResponse.json({ success: true, path: publicPath, filename: finalName });
  } catch (e: any) {
    console.error('[upload-node-icon] Failed:', e);
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
  }
}

