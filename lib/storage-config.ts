/**
 * AWS S3 Storage Configuration for CoEdit
 *
 * This file documents how the collaborative document platform stores data:
 *
 * 1. REAL-TIME COLLABORATION:
 *    - Live document editing uses Firebase Firestore for real-time sync
 *    - Document deltas (Quill operations) are stored temporarily in Firestore
 *
 * 2. VERSION SNAPSHOTS:
 *    - Document snapshots are saved as JSON files in S3
 *    - Path: documents/{userId}/{timestamp}-snapshot-{versionId}.json
 *    - Content: Quill Delta operations (JSON format)
 *    - Metadata: Stored in Firestore with S3 file keys
 *
 * 3. FILE ATTACHMENTS:
 *    - User-uploaded files (documents, images, etc.) stored in S3
 *    - Path: documents/{userId}/{timestamp}-{originalFileName}
 *    - Presigned URLs used for secure upload/download
 *
 * 4. STORAGE STRUCTURE:
 *    S3 Bucket: coedit-codeit/
 *    ├── documents/
 *    │   ├── {userId1}/
 *    │   │   ├── {timestamp}-snapshot-{versionId}.json  # Document snapshots
 *    │   │   ├── {timestamp}-document.pdf               # File attachments
 *    │   │   └── {timestamp}-image.png                  # Image attachments
 *    │   └── {userId2}/
 *    │       └── ...
 *
 * 5. FIRESTORE STRUCTURE:
 *    documents/{docId}
 *      - title, ownerId, collaborators, deltaOps (live)
 *      versions/{versionId}
 *        - fileKey (S3 path), fileName, fileType, size, createdAt, etc.
 *      invites/{userId}
 *        - email, status, createdAt, expiresAt
 *      presence/{userId}
 *        - name, color, index, length (cursor position)
 */

import {
  ALLOWED_FILE_TYPES,
  DOCUMENT_CONTENT_TYPES,
  MAX_FILE_SIZE,
  S3_BUCKET_NAME,
  S3_REGION
} from './s3-client';

// Storage configuration summary
export const STORAGE_CONFIG = {
  // AWS S3 Configuration
  s3: {
    bucketName: S3_BUCKET_NAME,
    region: S3_REGION,
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: Math.round(MAX_FILE_SIZE / 1024 / 1024),
  },

  // File type configuration
  fileTypes: {
    // Primary storage format for document snapshots
    documentSnapshots: DOCUMENT_CONTENT_TYPES,

    // All supported file types for uploads
    allowedUploads: ALLOWED_FILE_TYPES,

    // Categorized file types
    categories: {
      documents: [
        'application/json',
        'text/plain',
        'text/markdown',
        'application/pdf',
        'application/rtf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ],
      images: [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/webp',
        'image/svg+xml'
      ],
      data: [
        'text/csv',
        'application/xml',
        'text/xml'
      ]
    }
  },

  // Storage paths
  paths: {
    // Document snapshots (JSON format)
    snapshots: (userId: string, versionId: string) =>
      `documents/${userId}/${Date.now()}-snapshot-${versionId}.json`,

    // User file uploads
    uploads: (userId: string, fileName: string) =>
      `documents/${userId}/${Date.now()}-${fileName}`,

    // Base path for user files
    userBase: (userId: string) => `documents/${userId}/`
  },

  // Content types for different storage purposes
  contentTypes: {
    documentSnapshot: 'application/json',
    getContentType: (fileName: string) => {
      const ext = fileName.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        'json': 'application/json',
        'txt': 'text/plain',
        'md': 'text/markdown',
        'pdf': 'application/pdf',
        'rtf': 'application/rtf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'csv': 'text/csv',
        'xml': 'application/xml'
      };
      return mimeMap[ext || ''] || 'application/octet-stream';
    }
  }
} as const;

// Helper functions for storage operations
export const StorageUtils = {
  /**
   * Check if a file type is supported for upload
   */
  isFileTypeSupported: (mimeType: string): boolean => {
    return ALLOWED_FILE_TYPES.includes(mimeType);
  },

  /**
   * Check if file size is within limits
   */
  isFileSizeValid: (size: number): boolean => {
    return size <= MAX_FILE_SIZE;
  },

  /**
   * Get human-readable file size
   */
  formatFileSize: (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  },

  /**
   * Get file category based on MIME type
   */
  getFileCategory: (mimeType: string): 'document' | 'image' | 'data' | 'unknown' => {
    if (STORAGE_CONFIG.fileTypes.categories.documents.includes(mimeType as any)) {
      return 'document';
    }
    if (STORAGE_CONFIG.fileTypes.categories.images.includes(mimeType as any)) {
      return 'image';
    }
    if (STORAGE_CONFIG.fileTypes.categories.data.includes(mimeType as any)) {
      return 'data';
    }
    return 'unknown';
  },

  /**
   * Generate S3 key for document snapshot
   */
  generateSnapshotKey: (userId: string, versionId: string): string => {
    return STORAGE_CONFIG.paths.snapshots(userId, versionId);
  },

  /**
   * Generate S3 key for file upload
   */
  generateUploadKey: (userId: string, fileName: string): string => {
    return STORAGE_CONFIG.paths.uploads(userId, fileName);
  }
};
