import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids required" }, { status: 400 });
    }

    const cc: any = typeof (clerkClient as any) === 'function' ? await (clerkClient as any)() : (clerkClient as any);

    const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
    const results = await Promise.all(
      uniqueIds.map(async (id: string) => {
        try {
          const u = await cc.users.getUser(id);
          return {
            id: u.id,
            name: u.fullName || u.firstName || "Anonymous",
            email: u.primaryEmailAddress?.emailAddress || "",
            imageUrl: u.imageUrl || "",
          };
        } catch {
          return { id, name: "Unknown User", email: "", imageUrl: "" };
        }
      })
    );

    return NextResponse.json({ profiles: results });
  } catch (error) {
    console.error("profiles lookup failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


