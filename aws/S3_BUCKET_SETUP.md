# AWS S3 Setup for CoEdit (Files in S3, Versions in Firestore)

This project stores raw files in AWS S3 and saves each file version's metadata and S3 key in Firebase Firestore. Uploads and downloads use presigned URLs via Next.js API routes.

## 1) Create S3 Bucket

1. Go to the AWS S3 Console and click "Create bucket".
2. Bucket settings:
   - Bucket name: `coedit-codeit` (or your own)
   - Region: your preferred region (e.g., `us-east-1`)
   - Block Public Access: keep all ON
   - Default encryption: enable with AWS managed keys (SSE-S3)
   - Versioning: optional but recommended for durability/rollbacks

## 2) Create IAM User + Minimal Policy

Create a programmatic IAM user and attach a restrictive bucket-only policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::coedit-codeit",
        "arn:aws:s3:::coedit-codeit/*"
      ]
    }
  ]
}
```

Create an access key for this user and keep it safe.

## 3) Bucket CORS (for Presigned Upload/Download from the Browser)

Add this CORS configuration to your bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-domain.com"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

Notes:

- Presigned URLs include auth in the URL; bucket public access remains blocked.
- `PUT` is used for uploads; `GET` for downloads.

## 4) Environment Variables (.env.local)

Match the names used in the project README:

```ini
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_REGION=us-east-1
AWS_S3_BUCKET_NAME=coedit-codeit
```

## 5) How Upload/Download Works in This Repo

- Upload flow:

  1. Client calls `POST /api/upload` with `{ fileName, fileType, fileSize }`.
  2. API returns `{ uploadUrl, fileKey, fileName }`.
  3. Client uploads the file directly to S3 using `uploadUrl` (HTTP PUT).
  4. Store `fileKey` and related metadata in Firestore as a new version entry.
- Download flow:

  1. Client calls `POST /api/download` with `{ fileKey }`.
  2. API returns a time-limited `downloadUrl` (presigned GET) for the browser to fetch.

## 6) Suggested Firestore Data Model for Versions

Store S3 references and version metadata in Firestore:

```
documents/{docId}
  - title, ownerId, ...
  versions/{versionId}
    - fileKey: "documents/{userId}/{timestamp}-{fileName}"
    - fileName: string
    - fileType: string
    - size: number
    - createdAt: Timestamp
    - createdByUserId: string
    - commitMessage: string (optional)
    - downloadStrategy: "presigned" (generate on demand via /api/download)
```

## 7) Test the Integration

1. Run the dev server: `npm run dev`
2. Sign in
3. Upload a file via the UI
4. Confirm the object appears in S3 and a version entry exists in Firestore

## Security & Cost Tips

- Keep bucket public access blocked; rely on presigned URLs
- Use IAM least privilege scoped to your bucket only
- Enable bucket versioning for resilience (optional)
- Add lifecycle rules to transition old versions to cheaper storage
