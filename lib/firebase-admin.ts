import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// ---- Interface for type safety ----
interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

// ---- Normalize newlines in private key ----
function normalizePrivateKey(obj: any) {
  if (obj && typeof obj.private_key === "string") {
    obj.private_key = obj.private_key.replaceAll(String.raw`\n`, "\n");
  }
  return obj;
}

// ---- Try parsing plain JSON string ----
function tryParseJson(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return normalizePrivateKey(parsed);
  } catch {
    return undefined;
  }
}

// ---- Try decoding base64-encoded key ----
function tryParseBase64(raw: string) {
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    return normalizePrivateKey(parsed);
  } catch {
    return undefined;
  }
}

// ---- Core resolver (Vercel-compatible) ----
function resolveServiceAccount(): ServiceAccountKey | undefined {
  // 1️⃣ From direct JSON string in env (highest priority)
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (rawKey) {
    const asJson = tryParseJson(rawKey);
    if (asJson) return asJson;
    const asB64 = tryParseBase64(rawKey);
    if (asB64) return asB64;
  }

  // 2️⃣ From Base64 variable
  const keyB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
  if (keyB64) {
    const parsed = tryParseBase64(keyB64);
    if (parsed) return parsed;
  }

  // 3️⃣ Check if individual env vars are set (for Vercel use)
  // Vercel doesn't support file paths, so check for individual credential env vars
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKeyId = process.env.FIREBASE_PRIVATE_KEY_ID;
  const clientId = process.env.FIREBASE_CLIENT_ID;

  if (projectId && clientEmail && privateKey) {
    return {
      type: "service_account",
      project_id: projectId,
      private_key_id: privateKeyId || "",
      private_key: privateKey.replaceAll(String.raw`\n`, "\n"),
      client_email: clientEmail,
      client_id: clientId || "",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "",
      universe_domain: "googleapis.com",
    };
  }

  // ❌ Nothing found
  console.warn(
    "[firebase-admin] No valid service account credentials found. Please set FIREBASE_SERVICE_ACCOUNT_KEY (JSON or Base64), FIREBASE_SERVICE_ACCOUNT_KEY_BASE64, or individual env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
  );
  return undefined;
}

// ---- Initialize Firebase Admin ----
const serviceAccount = resolveServiceAccount();

const app =
  getApps().length === 0
    ? initializeApp({
        credential: serviceAccount ? cert(serviceAccount as any) : undefined,
        projectId:
          serviceAccount?.project_id ||
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
    : getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export default app;
