/**
 * File Storage System with Firebase Storage
 * Provides secure, user-isolated file storage for workflow executions
 */

import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { getFirestore, doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase if not already initialized
let storage: any;
let db: any;

if (typeof window !== 'undefined') {
  // Client-side
  import('@/firebase/provider').then(module => {
    // Use existing Firebase instance from provider
  });
} else {
  // Server-side - initialize if needed
  if (!getApps().length) {
    const app = initializeApp(firebaseConfig);
    storage = getStorage(app);
    db = getFirestore(app);
  } else {
    const app = getApps()[0];
    storage = getStorage(app);
    db = getFirestore(app);
  }
}

export interface FileReference {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  sizeFormatted: string;
  storagePath: string;
  downloadUrl?: string; // Optional: only set if needed
  userId: string;
  workflowId?: string;
  executionId?: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Generate a unique file ID
 */
export function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Store a file in Firebase Storage with user isolation
 * Path: /users/{userId}/temp-files/{executionId}/{fileId}
 */
export async function storeFile(
  buffer: ArrayBuffer,
  metadata: {
    name: string;
    mimeType: string;
    userId: string;
    executionId: string;
    workflowId?: string;
  },
  storageInstance?: any,
  dbInstance?: any
): Promise<FileReference> {
  const storageToUse = storageInstance || storage;
  const dbToUse = dbInstance || db;

  if (!storageToUse || !dbToUse) {
    throw new Error('Firebase Storage or Firestore not initialized');
  }

  const id = generateFileId();
  const storagePath = `users/${metadata.userId}/temp-files/${metadata.executionId}/${id}`;

  console.log(`[FileStorage] Storing file at: ${storagePath}`);

  try {
    // Upload to Firebase Storage
    const storageRef = ref(storageToUse, storagePath);
    const blob = new Blob([buffer], { type: metadata.mimeType });

    const uploadResult = await uploadBytes(storageRef, blob, {
      contentType: metadata.mimeType,
      customMetadata: {
        originalName: metadata.name,
        executionId: metadata.executionId,
        workflowId: metadata.workflowId || '',
        uploadedAt: Date.now().toString(),
      },
    });

    console.log(`[FileStorage] File uploaded successfully: ${id}`);

    // Create file reference (without download URL for now)
    const fileRef: FileReference = {
      id,
      name: metadata.name,
      mimeType: metadata.mimeType,
      size: buffer.byteLength,
      sizeFormatted: formatFileSize(buffer.byteLength),
      storagePath,
      userId: metadata.userId,
      executionId: metadata.executionId,
      workflowId: metadata.workflowId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour from now
    };

    // Save metadata to Firestore (without downloadUrl to save costs)
    const fileDocRef = doc(dbToUse, 'users', metadata.userId, 'temp-files', id);
    await setDoc(fileDocRef, fileRef);

    console.log(`[FileStorage] File metadata saved to Firestore: ${id}`);

    return fileRef;
  } catch (error) {
    console.error('[FileStorage] Failed to store file:', error);
    throw new Error(`Failed to store file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Store a file from a Blob
 */
export async function storeFileFromBlob(
  blob: Blob,
  name: string,
  metadata: {
    userId: string;
    executionId: string;
    workflowId?: string;
  },
  storageInstance?: any,
  dbInstance?: any
): Promise<FileReference> {
  const buffer = await blob.arrayBuffer();
  return storeFile(
    buffer,
    {
      name,
      mimeType: blob.type || 'application/octet-stream',
      ...metadata,
    },
    storageInstance,
    dbInstance
  );
}

/**
 * Store a file from base64 string
 */
export async function storeFileFromBase64(
  base64: string,
  fileMetadata: {
    name: string;
    mimeType: string;
    userId: string;
    executionId: string;
    workflowId?: string;
  },
  storageInstance?: any,
  dbInstance?: any
): Promise<FileReference> {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const buffer = base64ToArrayBuffer(base64Data);

  return storeFile(buffer, fileMetadata, storageInstance, dbInstance);
}

/**
 * Get a file reference by ID (from Firestore)
 */
export async function getFile(
  fileId: string,
  userId: string,
  dbInstance?: any
): Promise<FileReference | null> {
  const dbToUse = dbInstance || db;

  if (!dbToUse) {
    throw new Error('Firestore not initialized');
  }

  try {
    const fileDocRef = doc(dbToUse, 'users', userId, 'temp-files', fileId);
    const fileSnap = await getDoc(fileDocRef);

    if (!fileSnap.exists()) {
      console.warn(`[FileStorage] File not found: ${fileId}`);
      return null;
    }

    return fileSnap.data() as FileReference;
  } catch (error) {
    console.error('[FileStorage] Failed to get file:', error);
    return null;
  }
}

/**
 * Get file download URL (generates on-demand to save costs)
 */
export async function getFileDownloadUrl(
  fileId: string,
  userId: string,
  storageInstance?: any,
  dbInstance?: any
): Promise<string | null> {
  const storageToUse = storageInstance || storage;

  const fileRef = await getFile(fileId, userId, dbInstance);
  if (!fileRef) return null;

  try {
    const storageRef = ref(storageToUse, fileRef.storagePath);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error('[FileStorage] Failed to get download URL:', error);
    return null;
  }
}

/**
 * Get file as Blob (downloads from Firebase Storage)
 */
export async function getFileAsBlob(
  fileId: string,
  userId: string,
  storageInstance?: any,
  dbInstance?: any
): Promise<Blob | null> {
  const downloadUrl = await getFileDownloadUrl(fileId, userId, storageInstance, dbInstance);
  if (!downloadUrl) return null;

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Failed to download file');

    return await response.blob();
  } catch (error) {
    console.error('[FileStorage] Failed to get file as blob:', error);
    return null;
  }
}

/**
 * Get file as base64 string
 */
export async function getFileAsBase64(
  fileId: string,
  userId: string,
  storageInstance?: any,
  dbInstance?: any
): Promise<string | null> {
  const blob = await getFileAsBlob(fileId, userId, storageInstance, dbInstance);
  if (!blob) return null;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Get file as data URL
 */
export async function getFileAsDataUrl(
  fileId: string,
  userId: string,
  storageInstance?: any,
  dbInstance?: any
): Promise<string | null> {
  const fileRef = await getFile(fileId, userId, dbInstance);
  if (!fileRef) return null;

  const base64 = await getFileAsBase64(fileId, userId, storageInstance, dbInstance);
  if (!base64) return null;

  return `data:${fileRef.mimeType};base64,${base64}`;
}

/**
 * Delete a file from storage and Firestore
 */
export async function deleteFile(
  fileId: string,
  userId: string,
  storageInstance?: any,
  dbInstance?: any
): Promise<boolean> {
  const storageToUse = storageInstance || storage;
  const dbToUse = dbInstance || db;

  const fileRef = await getFile(fileId, userId, dbInstance);
  if (!fileRef) return false;

  try {
    // Delete from Storage
    const storageRef = ref(storageToUse, fileRef.storagePath);
    await deleteObject(storageRef).catch(err => {
      console.warn('[FileStorage] Failed to delete from storage:', err);
    });

    // Delete from Firestore
    const fileDocRef = doc(dbToUse, 'users', userId, 'temp-files', fileId);
    await deleteDoc(fileDocRef);

    console.log(`[FileStorage] File deleted: ${fileId}`);
    return true;
  } catch (error) {
    console.error('[FileStorage] Failed to delete file:', error);
    return false;
  }
}

/**
 * Delete all files for a specific execution
 */
export async function deleteExecutionFiles(
  userId: string,
  executionId: string,
  storageInstance?: any,
  dbInstance?: any
): Promise<number> {
  const dbToUse = dbInstance || db;

  try {
    const filesRef = collection(dbToUse, 'users', userId, 'temp-files');
    const q = query(filesRef, where('executionId', '==', executionId));
    const snapshot = await getDocs(q);

    let deletedCount = 0;
    for (const docSnapshot of snapshot.docs) {
      const fileData = docSnapshot.data() as FileReference;
      const success = await deleteFile(fileData.id, userId, storageInstance, dbInstance);
      if (success) deletedCount++;
    }

    console.log(`[FileStorage] Deleted ${deletedCount} files for execution: ${executionId}`);
    return deletedCount;
  } catch (error) {
    console.error('[FileStorage] Failed to delete execution files:', error);
    return 0;
  }
}

/**
 * Clean up expired files for a user
 * This should be called periodically (e.g., via Cloud Function)
 */
export async function cleanupExpiredFiles(
  userId: string,
  storageInstance?: any,
  dbInstance?: any
): Promise<number> {
  const dbToUse = dbInstance || db;

  try {
    const now = Date.now();
    const filesRef = collection(dbToUse, 'users', userId, 'temp-files');
    const q = query(filesRef, where('expiresAt', '<', now));

    const snapshot = await getDocs(q);

    let deletedCount = 0;
    for (const docSnapshot of snapshot.docs) {
      const fileData = docSnapshot.data() as FileReference;
      const success = await deleteFile(fileData.id, userId, storageInstance, dbInstance);
      if (success) deletedCount++;
    }

    if (deletedCount > 0) {
      console.log(`[FileStorage] Cleaned up ${deletedCount} expired files for user: ${userId}`);
    }

    return deletedCount;
  } catch (error) {
    console.error('[FileStorage] Failed to cleanup expired files:', error);
    return 0;
  }
}

/**
 * Get all files for a user
 */
export async function getAllUserFiles(
  userId: string,
  dbInstance?: any
): Promise<FileReference[]> {
  const dbToUse = dbInstance || db;

  try {
    const filesRef = collection(dbToUse, 'users', userId, 'temp-files');
    const snapshot = await getDocs(filesRef);

    return snapshot.docs.map(doc => doc.data() as FileReference);
  } catch (error) {
    console.error('[FileStorage] Failed to get user files:', error);
    return [];
  }
}

/**
 * Get storage statistics for a user
 */
export async function getUserStorageStats(
  userId: string,
  dbInstance?: any
): Promise<{
  totalFiles: number;
  totalSize: number;
  totalSizeFormatted: string;
  expiredFiles: number;
}> {
  const files = await getAllUserFiles(userId, dbInstance);
  const now = Date.now();

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const expiredFiles = files.filter(file => file.expiresAt < now).length;

  return {
    totalFiles: files.length,
    totalSize,
    totalSizeFormatted: formatFileSize(totalSize),
    expiredFiles,
  };
}

// Helper functions

/**
 * Helper: Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper: Convert base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get MIME type from filename
 */
export function getMimeTypeFromFilename(filename: string): string {
  const ext = getFileExtension(filename);

  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',

    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Text
    'txt': 'text/plain',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',

    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',

    // Audio/Video
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Extract filename from Content-Disposition header
 */
export function extractFilenameFromHeader(contentDisposition: string): string | null {
  if (!contentDisposition) return null;

  // Try filename*=UTF-8''filename first (RFC 5987)
  const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (filenameStarMatch) {
    return decodeURIComponent(filenameStarMatch[1]);
  }

  // Try filename="filename" or filename=filename
  const filenameMatch = contentDisposition.match(/filename[^;=\n]*=([^;\n]*)/i);
  if (filenameMatch) {
    let filename = filenameMatch[1].trim();
    // Remove quotes if present
    if (filename.startsWith('"') && filename.endsWith('"')) {
      filename = filename.slice(1, -1);
    }
    return filename;
  }

  return null;
}

// Export storage instances for use in other modules
export { storage, db };
