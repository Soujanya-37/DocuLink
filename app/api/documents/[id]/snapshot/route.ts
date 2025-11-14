import { PutObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import { FieldValue } from "firebase-admin/firestore";
import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { adminDb } from "@/lib/firebase-admin";
import type { VersionMeta } from "@/lib/firestore-types";
import { S3_BUCKET_NAME, s3Client } from "@/lib/s3-client";
import { StorageUtils } from "@/lib/storage-config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { delta, commitMessage } = await request.json();
    if (!delta)
      return NextResponse.json({ error: "Delta required" }, { status: 400 });

    const { id } = await params;
    const docRef = adminDb.collection("documents").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = docSnap.data()!;
    const hasAccess =
      data.ownerId === userId || (data.collaborators || []).includes(userId);
    if (!hasAccess)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const versionId = uuidv4();
    const timestamp = FieldValue.serverTimestamp();
    const fileName = `snapshot-${versionId}.json`;
    const s3Key = StorageUtils.generateSnapshotKey(userId, versionId);

    // Upload JSON delta to S3
    const putCmd = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      Body: JSON.stringify(delta),
      ContentType: "application/json",
    });
    await s3Client.send(putCmd);

    // Write Firestore metadata with proper structure to match VersionHistory component
    const versionData: any = {
      versionId,
      timestamp: new Date().toISOString(),
      createdBy: userId,
      s3Key,
      fileName,
      fileType: "application/json",
      size: JSON.stringify(delta).length,
      commitMessage: commitMessage || "No commit message provided",
    };

    await docRef.collection("versions").doc(versionId).set(versionData);
    await docRef.update({ updatedAt: timestamp });

    return NextResponse.json({ versionId, fileKey: s3Key });
  } catch (error) {
    console.error("Error saving snapshot:", error);
    return NextResponse.json(
      { error: "Failed to save snapshot" },
      { status: 500 },
    );
  }
}
