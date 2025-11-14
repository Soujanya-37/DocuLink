import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  console.log("📬 [Invite API] Request received.");
  try {
    const { userId } = await auth();
    console.log("👤 Authenticated userId:", userId);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const email = body?.email?.toLowerCase?.();
    console.log("📧 Invite email:", email);
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const { id } = params;
    console.log("📄 Document ID:", id);
    const docRef = adminDb.collection("documents").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const data = docSnap.data();
    console.log("📘 Document data:", { title: data?.title, ownerId: data?.ownerId });
    if (data?.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Try Clerk lookup if available
    let invitedUserId: string | null = null;
    try {
      if (clerkClient && (clerkClient as any).users && typeof (clerkClient as any).users.getUserList === "function") {
        console.log("🔎 Checking user in Clerk...");
        // newer Clerk shape uses clerkClient.users.getUserList(...)
        const users = await (clerkClient as any).users.getUserList({
          emailAddress: [email],
        });
        console.log("✅ Clerk result length:", users?.data?.length ?? "(no data)");
        if (users?.data && users.data.length > 0) {
          invitedUserId = users.data[0].id;
          console.log("👥 Found Clerk user id:", invitedUserId);
        } else {
          console.log("ℹ️ Clerk: no user found for that email.");
        }
      } else {
        // clerkClient.users missing — log and fall back to email-only invite
        console.warn("⚠️ clerkClient.users.getUserList not available; skipping Clerk lookup.");
      }
    } catch (clerkErr) {
      console.error("⚠️ Clerk lookup failed:", clerkErr);
      // continue — we will create an email-only invite
    }

    // Prevent duplicate invites (use invitedUserId if present, else use email as key)
    const inviteDocId = invitedUserId ?? email;
    const inviteRef = docRef.collection("invites").doc(inviteDocId);
    const inviteSnap = await inviteRef.get();
    if (inviteSnap.exists) {
      return NextResponse.json({ error: "User already invited" }, { status: 400 });
    }

    // Create invite (expires in 7 days)
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
    console.log("✅ Invite stored under document invites:", inviteDocId);

    // Fan-out to recipient's inbox: if we have a Clerk user id, write under that; otherwise write under email doc id
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
        { merge: true },
      );

      console.log("✅ Added to recipient inbox (doc:", inboxDocId, ")");
    } catch (inboxErr) {
      console.error("❌ Failed to write invite to user's inbox:", inboxErr);
      // Not fatal — return success for the document invite
    }

    // Optionally: enqueue an email send here (Resend / other service)
    // e.g. if you want to email the invited person even if not in Clerk.

    return NextResponse.json({
      message: "Invitation created (email-only if user not yet present).",
      invitedUserId,
    });
  } catch (error: any) {
    console.error("🔥 Full Invite API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
