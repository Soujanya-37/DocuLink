# 📄 DocuLink — Real-Time Collaborative Docs with Version Control

DocuLink is a real-time collaborative document editor with built-in version control. Teams can edit together, create labeled snapshots, analyze diffs with AI, and roll back instantly. It brings Google-Docs-style collaboration together with Git-like version history for fast, reliable teamwork.

Status: Ongoing project by Team DocuLink – Soujanya Shanbhag, Srujana J, Suhas Kashyap, Avinash H C

### ✨ Features
#### 📝 Real-Time Editing

Live collaborative editing with Quill + Firestore

Low-latency sync with real-time presence

Live cursors & selection indicators

#### 🗂 Versioning & History

Create snapshot versions with commit messages

Browse all previous versions

AI-powered diff explanations

One-click rollback to any snapshot

#### 🤖 AI-Powered Tools

Summaries: Auto-summarize long documents

Diff Analysis: Explain changes between versions

Speech-to-Text: Upload audio → convert to text

#### 🔗 Sharing & Access

Share documents via invite keys

Join with key or email invite

Manage pending collaboration requests

#### 📄 PDF Export

Export any snapshot as a clean, formatted PDF

Ensures consistent layout & styles

#### 🎨 Modern UI

Built with Shadcn/UI + Tailwind CSS

Responsive layout

Dark-mode ready

### 🧱 Architecture Overview

Here is the architecture summary table you requested (same style as your screenshot):

Layer / Component	Technology	Purpose
Frontend	Next.js (React)	UI + Client logic
Editor	Quill	Rich-text collaborative editor
Real-Time Sync	Firebase Firestore	Doc state, presence, metadata
Auth	Clerk	Authentication & session control
Object Storage	AWS S3	Snapshot JSON delta files
AI Engine	GROQ Models	Summaries, diffs, transcription
Backend Routes	Next.js App Router	API for snapshots, sharing, AI tools
🛠 Tech Stack
Category	Stack
Frontend	Next.js, React
UI/UX	Shadcn/UI, Tailwind CSS
Editor	Quill Rich-Text Editor
Database	Firebase Firestore
Storage	AWS S3
Authentication	Clerk
AI	GROQ Models
Other Tools	TypeScript, Vercel, Firebase Admin SDK

### 🧭 How It Works (Simple Overview)

Editing: Quill sends document deltas to Firestore as the user types

Presence: Each user updates their cursor position in a Firestore subcollection

Snapshots: Saved as JSON delta files in S3 + stored as metadata in Firestore

Version History: Versions displayed with timestamps + commit messages

AI Tools: Server routes call GROQ models for summaries & diff explanations

Sharing: Owner generates invite keys or sends email-based invites

PDF Export: Snapshot rendered and downloaded as PDF

### ▶️ Running the Project
npm install
npm run dev
# open http://localhost:3000

### 📌 Use Cases

Collaborative report or assignment writing

Team documentation platform

Shared note-taking for meetings

Version-controlled writing for projects

AI-supported review workflow

### 🙌 Team Credits

Team DocuLink (Ongoing Project)

Soujanya Shanbhag

Srujana J

Suhas Kashyap

Avinash H C
