import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(_request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create custom token for Firebase
    const customToken = await adminAuth.createCustomToken(userId, {
      clerkUserId: userId,
    });

    return NextResponse.json({ customToken });
  } catch (error: unknown) {
    // Common causes: missing FIREBASE_SERVICE_ACCOUNT_KEY, invalid JSON, or missing project config
    const msg =
      error instanceof Error ? error.message : "Failed to create custom token";
    console.error("Error creating custom token:", error);
    return NextResponse.json(
      {
        error: "Failed to create custom token",
        details: msg,
        hints: [
          "Ensure FIREBASE_SERVICE_ACCOUNT_KEY is set and valid JSON or a valid file path",
          "Ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID matches your Firebase project",
        ],
      },
      { status: 500 },
    );
  }
}
