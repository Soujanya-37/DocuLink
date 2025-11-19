import type { Timestamp } from "firebase/firestore";

// Document metadata stored in Firestore
export interface DocumentData {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  collaborators: string[];
  shareKey?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deltaOps?: any[]; // For real-time collaboration
}

// Version metadata stored in Firestore
// Supports both legacy (createdAt/fileKey/createdByUserId) and new (timestamp/s3Key/createdBy) fields
export interface VersionMeta {
  versionId: string;
  // New schema
  s3Key?: string; // S3 object key (new)
  timestamp?: string; // ISO string (new)
  createdBy?: string; // userId (new)
  // Legacy schema
  fileKey?: string; // S3 object key (legacy)
  createdAt?: Timestamp; // Firestore Timestamp (legacy)
  createdByUserId?: string; // userId (legacy)
  // Common metadata
  fileName: string;
  fileType: string;
  size: number;
  commitMessage?: string;
  downloadStrategy?: "presigned";
}

// Presence data for real-time collaboration
export interface PresenceData {
  name: string;
  color: string;
  index: number; // -1 means hidden
  length: number;
  updatedAt: Timestamp;
}

// Invite data for document sharing
export interface InviteData {
  email: string;
  invitedBy: string;
  status: "pending" | "accepted" | "declined";
  createdAt: Timestamp;
  expiresAt: Timestamp;
}
