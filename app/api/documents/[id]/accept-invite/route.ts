import { auth } from "@clerk/nextjs/server";
import { FieldValue } from "firebase-admin/firestore";
import { type NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { InviteData } from "@/lib/firestore-types";

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // get document ID from URL
    const { id } = context.params;

    // get current user from Clerk
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const docRef = adminDb.collection("documents").doc(id);
    const inviteRef = docRef.collection("invites").doc(userId);

    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      return NextResponse.json(
        { error: "No pending invitation found" },
        { status: 404 }
      );
    }

    const inviteData = inviteSnap.data() as InviteData;

    // Check if invite is expired
    if (inviteData.expiresAt && inviteData.expiresAt.toDate() < new Date()) {
      await inviteRef.delete();

      // remove from inbox
      try {
        const inboxRef = adminDb
          .collection("users")
          .doc(userId)
          .collection("invites")
          .doc(id);
        await inboxRef.delete();
      } catch (inboxError) {
        console.error("Failed to clean up inbox:", inboxError);
      }

      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410 }
      );
    }

    // Accept invite
    await inviteRef.update({
      status: "accepted",
    });

    // Add user to collaborators
    await docRef.update({
      collaborators: FieldValue.arrayUnion(userId),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Remove invite from inbox
    try {
      const inboxRef = adminDb
        .collection("users")
        .doc(userId)
        .collection("invites")
        .doc(id);
      await inboxRef.delete();
    } catch (inboxError) {
      console.error("Failed to clean up inbox:", inboxError);
    }

    return NextResponse.json({
      message: "Invitation accepted successfully",
      documentId: id,
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
