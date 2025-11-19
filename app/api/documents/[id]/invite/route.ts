import { auth, clerkClient } from "@clerk/nextjs/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import type { InviteData } from "@/lib/firestore-types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: any) {
  try {
    // Extract params safely
    const params = context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ error: "Missing document ID" }, { status: 400 });
    }

    // Read body
    const body = await request.json();
    const email = body?.email?.toLowerCase?.();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Verify user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Document lookup
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
      const users = await (clerkClient as any).users.getUserList({
        emailAddress: [email],
      });

      if (users?.data && users.data.length > 0) {
        invitedUserId = users.data[0].id;
      }
    } catch (err) {
      console.log("Clerk lookup failed but continuing:", err);
    }

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

    // Prepare invite data
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const inviteData: Omit<InviteData, "id"> = {
      email,
      invitedBy: userId,
      invitedUserId: invitedUserId ?? null,
      status: "pending",
      createdAt: FieldValue.serverTimestamp() as any,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + sevenDaysMs)) as any,
    };

    // Store invite
    await inviteRef.set(inviteData);

    // Fan-out to inbox
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
    } catch (err) {
      console.log("Inbox write failed (not fatal):", err);
    }

    return NextResponse.json({
      message: "Invitation created successfully",
      invitedUserId,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
