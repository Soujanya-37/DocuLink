"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

interface FileUploadProps {
  onUploadComplete?: (fileKey: string, fileName: string) => void;
  onError?: (error: string) => void;
}

export default function FileUpload({
  onUploadComplete,
  onError,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { isSignedIn } = useAuth();

  const handleFileUpload = async (file: File) => {
    if (!isSignedIn) {
      onError?.("You must be signed in to upload files");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get presigned URL
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get upload URL");
      }

      const { uploadUrl, fileKey, fileName } = await response.json();

      // Step 2: Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to S3");
      }

      setUploadProgress(100);
      onUploadComplete?.(fileKey, fileName);
    } catch (error) {
      console.error("Upload error:", error);
      onError?.(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <input
          type="file"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
          id="file-upload"
          accept=".txt,.md,.json,.pdf,.rtf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.svg,.csv,.xml"
        />
        <label htmlFor="file-upload" className="cursor-pointer block">
          {isUploading ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Uploading...</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-lg font-medium">Upload Document</div>
              <div className="text-sm text-gray-500">
                Click to select a file or drag and drop
              </div>
              <div className="text-xs text-gray-400">
                Max size: 10MB | Supported: Documents (TXT, MD, JSON, PDF, RTF, DOC, DOCX), Images (PNG, JPG, GIF, WebP, SVG), Data (CSV, XML)
              </div>
            </div>
          )}
        </label>
      </div>
    </div>
  );
}
