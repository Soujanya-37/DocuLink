"use client";

import { useAuth } from "@clerk/nextjs";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { useEffect } from "react";
import { auth } from "@/lib/firebase-client";

export default function FirebaseAuthSync() {
  const { isSignedIn, userId } = useAuth();

  useEffect(() => {
    const syncFirebaseAuth = async () => {
      if (isSignedIn && userId) {
        try {
          // Get custom token from our API
          const response = await fetch("/api/auth/firebase-custom-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
          });

          if (!response.ok) {
            let details: unknown;
            try {
              details = await response.json();
            } catch (_) {
              details = await response.text();
            }
            // Surface more context to help diagnose setup issues
            // eslint-disable-next-line no-console
            console.error(
              "Failed to get custom token - server response:",
              details,
            );
            throw new Error("Failed to get custom token");
          }

          const { customToken } = await response.json();

          // Sign in to Firebase with custom token
          await signInWithCustomToken(auth, customToken);
          // eslint-disable-next-line no-console
          console.log("Successfully signed in to Firebase");
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Error syncing Firebase auth:", error);
        }
      } else {
        // Sign out from Firebase when Clerk user signs out
        try {
          await signOut(auth);
          // eslint-disable-next-line no-console
          console.log("Successfully signed out from Firebase");
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Error signing out from Firebase:", error);
        }
      }
    };

    syncFirebaseAuth();
  }, [isSignedIn, userId]);

  // This component doesn't render anything
  return null;
}
