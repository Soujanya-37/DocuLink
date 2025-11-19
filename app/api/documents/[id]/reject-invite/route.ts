import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { InviteData } from "@/lib/firestore-types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const docRef = adminDb.collection("documents").doc(id);
    const inviteRef = docRef.collection("invites").doc(userId);

    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists) {
      return NextResponse.json(
        { error: "No pending invitation found" },
        { status: 404 },
      );
    }

    const inviteData = inviteSnap.data() as InviteData;

    // Check if invite is still valid (not expired)
    if (inviteData.expiresAt && inviteData.expiresAt.toDate() < new Date()) {
      await inviteRef.delete();
      // Also clean up the user's inbox
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
        { status: 410 },
      );
    }

    // Update invite status to declined
    await inviteRef.update({
      status: "declined",
    });

    // Clean up the user's inbox - remove the invite entry
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
      message: "Invitation declined successfully",
    });
  } catch (error) {
    console.error("Error declining invitation:", error);
    return NextResponse.json(
      { error: "Failed to decline invitation" },
      { status: 500 },
    );
  }
}
