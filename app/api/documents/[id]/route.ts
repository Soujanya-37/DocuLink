import { auth } from "@clerk/nextjs/server";
import { FieldValue } from "firebase-admin/firestore";
import { type NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const docSnap = await adminDb.collection("documents").doc(id).get();
    if (!docSnap.exists)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = docSnap.data()!;
    const hasAccess =
      data.ownerId === userId || (data.collaborators || []).includes(userId);
    if (!hasAccess)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ id, ...data });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { title, description } = await request.json();

    const docRef = adminDb.collection("documents").doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = docSnap.data()!;
    const hasAccess =
      data.ownerId === userId || (data.collaborators || []).includes(userId);
    if (!hasAccess)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Only allow title/description updates
    const updateData: any = { updatedAt: FieldValue.serverTimestamp() };
    if (title !== undefined) {
      updateData.title = title.trim() || "Untitled";
    }
    if (description !== undefined) {
      updateData.description = description.trim() || "";
    }

    await docRef.update(updateData);

    return NextResponse.json({ 
      message: "Document updated successfully",
      title: updateData.title,
      description: updateData.description
    });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 },
    );
  }
}
