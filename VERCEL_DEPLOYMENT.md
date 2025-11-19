# Vercel Deployment Guide for DocuLink

## Issues Fixed for Vercel Compatibility

### 1. ✅ File System Access Removed (`firebase-admin.ts`)
**Problem:** Vercel is a serverless platform that doesn't have persistent file system access. The original code tried to read service account keys from disk using `fs.readFileSync()` and `process.cwd()`, which fails on Vercel.

**Solution:** 
- Removed all file system operations
- Updated to use environment variables only
- Added support for individual Firebase credentials as separate env vars
- Private keys are now passed as strings via environment variables

### 2. ✅ Next.js Configuration Updated (`next.config.ts`)
**Problem:** Missing build optimizations and webpack configurations for serverless deployment.

**Solution:**
- Added webpack fallback for `fs`, `path`, and `crypto` modules on client side
- Enabled SWC minification
- Configured image optimization
- Added proper environment variable handling

### 3. ✅ Window Object Access Fixed (`ShareAccess.tsx`)
**Problem:** Direct access to `window.location` causes SSR (Server-Side Rendering) errors because the component renders on the server first.

**Solution:**
- Wrapped `window.location` access in a `useEffect` hook
- Used `globalThis.window` for better SSR compatibility
- URL is now only accessed on the client side

## How to Deploy to Vercel

### Step 1: Update Environment Variables

Set the following variables in Vercel project settings. Go to **Project Settings → Environment Variables** and add:

#### Option A: Individual Environment Variables (Recommended)
```
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----
FIREBASE_PRIVATE_KEY_ID=your_key_id
FIREBASE_CLIENT_ID=your_client_id
```

#### Option B: JSON String
```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your_id",...}
```

#### Option C: Base64 Encoded
```
FIREBASE_SERVICE_ACCOUNT_KEY_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50In0=
```

### Step 2: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → Project Settings → Service Accounts
3. Click "Generate New Private Key"
4. Download the JSON file

**For Option A (Individual vars):**
- Copy `project_id` → `FIREBASE_PROJECT_ID`
- Copy `client_email` → `FIREBASE_CLIENT_EMAIL`
- Copy `private_key` → `FIREBASE_PRIVATE_KEY` (with literal `\n` for newlines)
- Copy `private_key_id` → `FIREBASE_PRIVATE_KEY_ID`
- Copy `client_id` → `FIREBASE_CLIENT_ID`

**For Option B (JSON string):**
- Paste the entire JSON content

**For Option C (Base64):**
```bash
# On macOS/Linux
cat serviceAccountKey.json | base64

# On Windows PowerShell
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("serviceAccountKey.json"))
```

### Step 3: Add Public Firebase Variables

In the same Environment Variables section, add (these can be public):
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

### Step 4: Add Other Service Keys

Add your AWS S3, Clerk, OpenAI, and other service credentials:
```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
OPENAI_API_KEY=...
```

### Step 5: Deploy

```bash
# Push to Git (GitHub, GitLab, or Bitbucket)
git push

# Vercel will automatically deploy on push
# Or manually deploy:
vercel deploy --prod
```

## Troubleshooting

### "Firebase Admin not initialized"
- Check that all Firebase environment variables are set
- Verify `FIREBASE_PRIVATE_KEY` has literal `\n` characters (not escaped)
- Test locally: `FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----" npm run build`

### Build fails with "Cannot find module 'fs'"
- This is expected for client-side code - webpack fallbacks should handle it
- Check that `next.config.ts` has the webpack configuration

### Deployment takes longer than expected
- First build can take 2-3 minutes - this is normal
- Check build logs in Vercel dashboard for errors

### Environment variables not loading
- Ensure variables are set for the correct environment (Production, Preview, Development)
- Redeploy after updating environment variables
- Clear Vercel cache: **Project Settings → Git → Clear Cache**

## Local Testing

To test before deploying:

```bash
# Create .env.local with your credentials
cp .env.example .env.local

# Edit and add your actual values to .env.local
# Make sure NOT to commit .env.local to Git

# Build locally (simulates Vercel build)
npm run build

# Start production server
npm run start
```

## Security Best Practices

✅ **DO:**
- Use Vercel's environment variables (not `.env` files in Git)
- Rotate service account keys periodically
- Use different Firebase projects for development, staging, and production
- Monitor API usage in Firebase Console

❌ **DON'T:**
- Commit `.env.local` or any credential files to Git
- Share service account keys via email or chat
- Use the same credentials across environments
- Expose `FIREBASE_PRIVATE_KEY` in client-side code (it's server-only)

## Files Modified

- `lib/firebase-admin.ts` - Removed file system access, added env var support
- `next.config.ts` - Added Vercel deployment optimizations
- `components/ShareAccess.tsx` - Fixed window.location for SSR
- `.env.example` - Added environment variable template

All changes maintain backward compatibility with local development.
