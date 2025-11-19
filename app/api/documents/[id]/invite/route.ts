import { auth, clerkClient } from "@clerk/nextjs/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import type { InviteData } from "@/lib/firestore-types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    const body = await request.json();
    const email = body?.email?.toLowerCase?.();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const docRef = adminDb.collection("documents").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const data = docSnap.data();
    if (data?.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Try Clerk lookup
    let invitedUserId: string | null = null;
    try {
      if (
        clerkClient &&
        (clerkClient as any).users &&
        typeof (clerkClient as any).users.getUserList === "function"
      ) {
        const users = await (clerkClient as any).users.getUserList({
          emailAddress: [email],
        });

        if (users?.data && users.data.length > 0) {
          invitedUserId = users.data[0].id;
        }
      }
    } catch (_) {}

    // Prevent duplicate invites
    const inviteDocId = invitedUserId ?? email;
    const inviteRef = docRef.collection("invites").doc(inviteDocId);
    const inviteSnap = await inviteRef.get();

    if (inviteSnap.exists) {
      return NextResponse.json(
        { error: "User already invited" },
        { status: 400 }
      );
    }

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const inviteData: Omit<InviteData, "id"> = {
      email,
      invitedBy: userId,
      invitedUserId: invitedUserId ?? null,
      status: "pending",
      createdAt: FieldValue.serverTimestamp() as any,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + sevenDaysMs)) as any,
    };

    await inviteRef.set(inviteData);

    // Write to inbox
    try {
      const inboxDocId = invitedUserId ?? email;
      const inboxRef = adminDb
        .collection("users")
        .doc(inboxDocId)
        .collection("invites")
        .doc(id);

      await inboxRef.set(
        {
          documentId: id,
          documentTitle: data.title || "Untitled",
          invite: inviteData,
          invitedUserId: invitedUserId ?? null,
          createdAt: FieldValue.serverTimestamp() as any,
        },
        { merge: true }
      );
    } catch (_) {}

    return NextResponse.json({
      message: "Invitation created successfully",
      invitedUserId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
