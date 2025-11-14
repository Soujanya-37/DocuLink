import { S3Client } from "@aws-sdk/client-s3";

// Initialize S3 Client
const REGION = process.env.AWS_S3_REGION || process.env.AWS_REGION || "us-east-1";
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";

export const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

// S3 bucket configuration
export const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || ""; // must be set in env
export const S3_REGION = REGION;

if (!S3_BUCKET_NAME) {
  console.warn("[s3-client] AWS_S3_BUCKET_NAME is not set. Snapshots will fail to upload until configured.");
}
if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.warn("[s3-client] AWS credentials are missing. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.");
}

// File upload configuration
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Primary storage: Document snapshots (JSON deltas)
export const DOCUMENT_CONTENT_TYPES = [
  "application/json", // Primary: Quill Delta operations for document snapshots
];

// Supported file types for document attachments and imports
export const ALLOWED_FILE_TYPES = [
  // Document formats (primary use case)
  "application/json", // Document snapshots and structured data
  "text/plain", // Plain text documents
  "text/markdown", // Markdown documents
  "application/pdf", // PDF documents

  // Rich text formats
  "application/rtf", // Rich Text Format
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc

  // Images (for document attachments)
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",

  // Other common formats
  "text/csv", // CSV files
  "application/xml", // XML files
  "text/xml", // XML files (alternative MIME type)
];
