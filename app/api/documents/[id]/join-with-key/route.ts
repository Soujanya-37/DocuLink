import { auth } from "@clerk/nextjs/server";
import { FieldValue } from "firebase-admin/firestore";
import { type NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { key } = await request.json();
    if (!key)
      return NextResponse.json({ error: "Key required" }, { status: 400 });

    const { id } = await params;
    const docRef = adminDb.collection("documents").doc(id);
    const snap = await docRef.get();
    if (!snap.exists)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = snap.data()!;
    if (!data.shareKey || data.shareKey !== key) {
      return NextResponse.json({ error: "Invalid key" }, { status: 403 });
    }

    await docRef.update({ collaborators: FieldValue.arrayUnion(userId) });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error joining with key:", error);
    return NextResponse.json({ error: "Failed to join" }, { status: 500 });
  }
}
