/**
 * ⚠️ DEPRECATED - DO NOT USE
 *
 * This file has been replaced by file-storage.ts
 *
 * @deprecated Use @/lib/file-storage instead
 * @see {@link file-storage.ts} for the new implementation with Firebase Storage
 *
 * PROBLEMS WITH THIS FILE:
 * - ❌ Files are stored in a global Map (shared between all users)
 * - ❌ No user isolation (security risk)
 * - ❌ Files are lost on server restart
 * - ❌ Does not scale with multiple server instances
 *
 * MIGRATION GUIDE:
 * See: src/docs/file-storage-migration-guide.md
 *
 * File utilities for handling temporary files in workflows
 */

export interface FileReference {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  buffer?: ArrayBuffer;
  base64?: string;
  url?: string;
  createdAt: number;
}

// In-memory storage for temporary files during workflow execution
const fileStorage = new Map<string, FileReference>();

/**
 * Generate a unique file ID
 */
export function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * @deprecated Use storeFile from @/lib/file-storage instead
 * Store a file buffer in memory
 */
export function storeFile(buffer: ArrayBuffer, metadata: {
  name: string;
  mimeType: string;
}): FileReference {
  console.warn('[DEPRECATED] file-utils.storeFile() is deprecated. Use file-storage.ts instead.');
  console.warn('Migration guide: src/docs/file-storage-migration-guide.md');
  const id = generateFileId();
  const fileRef: FileReference = {
    id,
    name: metadata.name,
    mimeType: metadata.mimeType,
    size: buffer.byteLength,
    buffer,
    createdAt: Date.now(),
  };

  fileStorage.set(id, fileRef);

  // Auto-cleanup after 1 hour
  setTimeout(() => {
    fileStorage.delete(id);
  }, 60 * 60 * 1000);

  return fileRef;
}

/**
 * Store a file from a Blob
 */
export async function storeFileFromBlob(blob: Blob, name: string): Promise<FileReference> {
  const buffer = await blob.arrayBuffer();
  return storeFile(buffer, {
    name,
    mimeType: blob.type || 'application/octet-stream',
  });
}

/**
 * Store a file from base64 string
 */
export function storeFileFromBase64(base64: string, metadata: {
  name: string;
  mimeType: string;
}): FileReference {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const buffer = base64ToArrayBuffer(base64Data);

  const fileRef = storeFile(buffer, metadata);
  fileRef.base64 = base64Data;

  return fileRef;
}

/**
 * Get a file reference by ID
 */
export function getFile(id: string): FileReference | undefined {
  return fileStorage.get(id);
}

/**
 * Get file as Blob
 */
export function getFileAsBlob(id: string): Blob | undefined {
  const file = getFile(id);
  if (!file || !file.buffer) return undefined;

  return new Blob([file.buffer], { type: file.mimeType });
}

/**
 * Get file as base64 string
 */
export function getFileAsBase64(id: string): string | undefined {
  const file = getFile(id);
  if (!file) return undefined;

  if (file.base64) return file.base64;

  if (file.buffer) {
    return arrayBufferToBase64(file.buffer);
  }

  return undefined;
}

/**
 * Get file as data URL
 */
export function getFileAsDataUrl(id: string): string | undefined {
  const file = getFile(id);
  if (!file) return undefined;

  const base64 = getFileAsBase64(id);
  if (!base64) return undefined;

  return `data:${file.mimeType};base64,${base64}`;
}

/**
 * Create a download URL for a file
 */
export function createFileDownloadUrl(id: string): string | undefined {
  const blob = getFileAsBlob(id);
  if (!blob) return undefined;

  const url = URL.createObjectURL(blob);

  // Store URL in file reference for cleanup
  const file = getFile(id);
  if (file) {
    file.url = url;
  }

  return url;
}

/**
 * Delete a file from storage
 */
export function deleteFile(id: string): boolean {
  const file = getFile(id);
  if (file?.url) {
    URL.revokeObjectURL(file.url);
  }

  return fileStorage.delete(id);
}

/**
 * Clear all files from storage
 */
export function clearAllFiles(): void {
  fileStorage.forEach(file => {
    if (file.url) {
      URL.revokeObjectURL(file.url);
    }
  });

  fileStorage.clear();
}

/**
 * Get all stored files
 */
export function getAllFiles(): FileReference[] {
  return Array.from(fileStorage.values());
}

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
