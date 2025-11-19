import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, S3_BUCKET_NAME, s3Client } from "@/lib/s3-client";
import { StorageUtils } from "@/lib/storage-config";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileName, fileType, fileSize } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "fileName and fileType are required" },
        { status: 400 },
      );
    }

    // Validate file type using storage utilities
    if (!StorageUtils.isFileTypeSupported(fileType)) {
      const category = StorageUtils.getFileCategory(fileType);
      return NextResponse.json(
        {
          error: `File type '${fileType}' not supported. Category: ${category}. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`
        },
        { status: 400 },
      );
    }

    // Validate file size using storage utilities
    if (fileSize && !StorageUtils.isFileSizeValid(fileSize)) {
      return NextResponse.json(
        {
          error: `File size ${StorageUtils.formatFileSize(fileSize)} exceeds limit of ${StorageUtils.formatFileSize(MAX_FILE_SIZE)}`
        },
        { status: 400 },
      );
    }

    // Generate unique file key using storage utilities
    const fileKey = StorageUtils.generateUploadKey(userId, fileName);

    // Create presigned URL for upload
    const putCommand = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, putCommand, {
      expiresIn: 3600, // 1 hour
    });

    return NextResponse.json({
      uploadUrl,
      fileKey,
      fileName,
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}
