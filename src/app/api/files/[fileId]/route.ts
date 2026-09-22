import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { getFile, getFileDownloadUrl, getFileAsBlob } from '@/lib/file-storage';

// Initialize Firebase for server-side
let storage: any;
let db: any;

if (!getApps().length) {
  const app = initializeApp(firebaseConfig);
  storage = getStorage(app);
  db = getFirestore(app);
} else {
  const app = getApps()[0];
  storage = getStorage(app);
  db = getFirestore(app);
}

/**
 * Secure File Access API
 * GET /api/files/[fileId]?action=download|url|metadata
 *
 * Requires authentication and verifies user owns the file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'url'; // url, download, metadata

    // 1. Get auth token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // 2. Verify token and get userId
    // Note: In production, you should verify the token with Firebase Admin SDK
    // For now, we'll use a simplified approach
    const admin = await import('firebase-admin');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }

    let userId: string;
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      console.error('[FileAPI] Token verification failed:', error);
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    console.log(`[FileAPI] Request from user ${userId} for file ${fileId}`);

    // 3. Get file metadata and verify ownership
    const fileRef = await getFile(fileId, userId, db);

    if (!fileRef) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // 4. Verify user owns the file
    if (fileRef.userId !== userId) {
      console.warn(`[FileAPI] User ${userId} attempted to access file owned by ${fileRef.userId}`);
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this file' },
        { status: 403 }
      );
    }

    // 5. Check if file is expired
    if (fileRef.expiresAt < Date.now()) {
      return NextResponse.json(
        { error: 'File has expired' },
        { status: 410 }
      );
    }

    // 6. Handle different actions
    switch (action) {
      case 'metadata':
        // Return file metadata only
        return NextResponse.json({
          id: fileRef.id,
          name: fileRef.name,
          mimeType: fileRef.mimeType,
          size: fileRef.size,
          sizeFormatted: fileRef.sizeFormatted,
          createdAt: fileRef.createdAt,
          expiresAt: fileRef.expiresAt,
        });

      case 'url':
        // Return download URL
        const downloadUrl = await getFileDownloadUrl(fileId, userId, storage, db);
        if (!downloadUrl) {
          return NextResponse.json(
            { error: 'Failed to generate download URL' },
            { status: 500 }
          );
        }
        return NextResponse.json({
          url: downloadUrl,
          expiresIn: 3600, // Firebase Storage URLs expire after 1 hour
        });

      case 'download':
        // Stream file directly
        const blob = await getFileAsBlob(fileId, userId, storage, db);
        if (!blob) {
          return NextResponse.json(
            { error: 'Failed to download file' },
            { status: 500 }
          );
        }

        const buffer = await blob.arrayBuffer();

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': fileRef.mimeType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileRef.name)}"`,
            'Content-Length': buffer.byteLength.toString(),
            'Cache-Control': 'private, max-age=3600',
          },
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: metadata, url, or download' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[FileAPI] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a file
 * DELETE /api/files/[fileId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    // 1. Get auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // 2. Verify token
    const admin = await import('firebase-admin');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }

    let userId: string;
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // 3. Get file and verify ownership
    const fileRef = await getFile(fileId, userId, db);

    if (!fileRef) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    if (fileRef.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 4. Delete file
    const { deleteFile } = await import('@/lib/file-storage');
    const success = await deleteFile(fileId, userId, storage, db);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('[FileAPI] Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
