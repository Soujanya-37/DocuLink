import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { InviteData } from "@/lib/firestore-types";

/**
 * GET /api/documents/[id]/invites/pending
 * Returns all pending invites for a specific document
 */
export async function GET(request: Request, context: any) {
  try {
    const params = context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ error: "Missing document ID" }, { status: 400 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const docRef = adminDb.collection("documents").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const docData = docSnap.data();
    if (docData?.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all invites
    const invitesSnap = await docRef.collection("invites").get();
    const now = new Date();

    const pendingInvites: Array<{
      invitedUserId: string;
      email: string;
      status: string;
      createdAt: string;
      expiresAt: string | null;
    }> = [];

    invitesSnap.forEach((inviteDoc) => {
      const data = inviteDoc.data() as InviteData;
      if (data.status !== "pending") return;

      let isExpired = false;

      if (data.expiresAt) {
        try {
          const expires = typeof data.expiresAt.toDate === "function"
            ? data.expiresAt.toDate()
            : new Date(data.expiresAt);

          isExpired = expires < now;
        } catch (err) {
          console.warn("⚠️ Could not parse expiresAt:", err);
        }
      }

      if (!isExpired) {
        pendingInvites.push({
          invitedUserId: inviteDoc.id,
          email: data.email,
          status: data.status,
          createdAt: data.createdAt?.toDate?.().toISOString?.() ?? "Unknown",
          expiresAt:
            data.expiresAt?.toDate?.().toISOString?.() ??
            data.expiresAt?.toString() ??
            null,
        });
      }
    });

    return NextResponse.json({
      documentId: id,
      totalPending: pendingInvites.length,
      invites: pendingInvites,
    });
  } catch (error) {
    console.error("❌ Error fetching pending invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending invites" },
      { status: 500 }
    );
  }
}
