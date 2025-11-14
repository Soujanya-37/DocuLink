# DocuLink — Real‑Time Collaborative Docs with Version Control

DocuLink is a real‑time collaborative document platform with built‑in version control. Teams can edit together, save snapshots with commit messages, browse version history, analyze diffs with AI, and roll back instantly. It’s Google‑Docs‑style collaboration with Git‑like superpowers.

---

## ✨ Features

- **Real‑time editing (Quill + Firestore):** Low‑latency collaboration with presence and live cursors.
- **Snapshots with commit messages:** Save any state with a label; stored in S3 for durability.
- **Version history and rollback:** Browse historical snapshots, preview diff analysis, and revert.
- **AI helpers:**
  - Document summarization (`/api/ai/summarize`)
  - AI diff explanations for versions (`/api/ai/diff`)
  - Speech‑to‑Text uploads (`/api/ai/transcribe`)
- **Share & invites:** Generate share keys, join by key, and manage invites.
- **PDF export:** Save a snapshot and export that exact snapshot to PDF with consistent layout.
- **Polished UI:** Shadcn/UI + Tailwind; responsive, dark‑mode ready.
---

## 🧱 Architecture

- **Next.js App Router** for both UI and API routes
- **Auth:** Clerk (user identity + session)
- **Editor:** Quill (client‑side), Firestore for document state
- **Presence:** Firestore `documents/{id}/presence` subcollection
- **Snapshots:** JSON deltas stored in AWS S3; metadata in Firestore `documents/{id}/versions`
- **AI:** Server routes calling GROQ models for summarize/diff and a transcription endpoint

---

## 🛠 Tech Stack

| Category       | Technology               | Purpose                                       |
| -------------- | ------------------------ | --------------------------------------------- |
| Frontend       | Next.js (React)          | App framework, UI, and server API routes      |
| UI/UX          | Shadcn/UI + Tailwind CSS | Component library and modern styling          |
| Text Editor    | Quill                    | Rich‑text editor for collaborative editing    |
| Real‑Time Sync | Firebase Firestore       | Realtime doc state, presence, metadata        |
| Object Store   | AWS S3                   | Snapshot payloads (JSON delta files)          |
| Auth           | Clerk                    | Authentication and user profiles              |
| AI             | GROQ                     | Summaries and diff explanations               |

---

## 📂 Project Structure (high‑level)

```
app/
  api/
    ai/
      summarize/route.ts      # POST summarize text (GROQ)
      check-plagiarism/route.ts # POST plagiarism report text (GROQ
      diff/route.ts           # POST analyze version diff (GROQ)
      transcribe/route.ts     # POST audio -> text
    documents/
      [id]/
        snapshot/route.ts     # POST save snapshot (to S3 + Firestore)
        share/route.ts        # POST create share key
        join-with-key/route.ts# POST join document by key
        invite/route.ts       # POST invite by email
        invites/pending/route.ts # GET pending invites for doc owner
    download/route.ts         # POST S3 presign for a snapshot
    upload/route.ts           # (if used) upload helper
    users/profiles/route.ts   # POST lookup Clerk profiles by IDs
  docs/[id]/FirebaseEditor.tsx# Quill editor + presence + AI + export
  docs/[id]/VersionHistory.tsx# Versions list, diff modal, revert
components/DocumentSidebar.tsx# Tools sidebar (versions, share, invites)
lib/                         # Firebase client/admin, S3 client, utils
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Firestore enabled
- An AWS S3 bucket (and credentials)
- A Clerk application (for auth)

### Environment Variables

Use `.env.local`. See the full guide in `ENVIRONMENT_SETUP.md`. Summary:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase Admin (service account)
FIREBASE_SERVICE_ACCOUNT_KEY={...json...}

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET_NAME=

# AI
GROQ_API_KEY=
```

### Install and Run

```bash
npm install
npm run dev
# open http://localhost:3000
```

Optional scripts:

```bash
npm run build
npm run start
npm run lint       # biome check
npm run lint:fix   # biome check --write
npm run type-check # tsc --noEmit
```

---

## 🧭 Core Flows

### Authentication
- Clerk guards server routes; client uses `<SignedIn/>` / `<SignedOut/>` and `useAuth()`.

### Editing & Presence
- `FirebaseEditor.tsx` initializes Quill and syncs doc state to Firestore (`documents/{id}`) as `deltaOps`.
- Presence is written to `documents/{id}/presence/{userId}` with `{ name, color, index, length }`.

### Snapshots & Version History
- Saving snapshot: `POST /api/documents/{id}/snapshot` with `{ delta, commitMessage }`.
- Metadata saved to Firestore `documents/{id}/versions` and JSON delta to S3.
- `VersionHistory.tsx` lists versions, opens AI diff modal, and supports revert.

### AI
- Summarize: `POST /api/ai/summarize` → `{ summary }` (Markdown supported in UI)
- Diff explain: `POST /api/ai/diff` → `{ analysis }` (Markdown rendered)
- Transcribe: `POST /api/ai/transcribe` (multipart `file`) → `{ text }`

### Sharing & Invites
- Generate share link: `POST /api/documents/{id}/share` → `{ shareKey }`
- Join with key: `POST /api/documents/{id}/join-with-key` with `{ key }`
- Owner pending invites: `GET /api/documents/{id}/invites/pending`
- Invite collaborator: `POST /api/documents/{id}/invite` with `{ email }`

### PDF Export
- Download button prompts to save a snapshot (with message) and then downloads that exact snapshot as a PDF.
- If no unsaved changes, you can also export the latest snapshot.

---

## 🔌 API Quick Reference

Examples use `curl` and assume you’re authenticated via cookies in the browser; for local testing, call from the UI or attach session cookies.

Summarize:

```bash
curl -X POST http://localhost:3000/api/ai/summarize \
  -H "Content-Type: application/json" \
  -d '{"text":"Your content here"}'
```

Analyze diff:

```bash
curl -X POST http://localhost:3000/api/ai/diff \
  -H "Content-Type: application/json" \
  -d '{"currentText":"...","previousText":"...","meta":{"versionId":"abc"}}'
```

Save snapshot:

```bash
curl -X POST http://localhost:3000/api/documents/DOC_ID/snapshot \
  -H "Content-Type: application/json" \
  -d '{"delta": {"ops":[{"insert":"Hello"}]}, "commitMessage":"Init"}'
```

Presign download for snapshot:

```bash
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"fileKey":"snapshots/.../snapshot-....json"}'
```

---

## 🔐 Notes on Security & Limits

- Ensure Firestore rules and S3 IAM policies restrict access appropriately in production.
- Current AI routes call GROQ; set `GROQ_API_KEY` in your environment.
- The app is optimized for hackathon speed; add rate limiting, input validation, and error handling as needed for production.

---

## 🧭 Roadmap Ideas

- Role‑based permissions (owner, editor, viewer)
- Inline comments and suggestions
- Advanced diff views (word/character level)
- Offline edits and conflict visualization

---

## 📄 License

MIT — see [LICENSE](LICENSE).

