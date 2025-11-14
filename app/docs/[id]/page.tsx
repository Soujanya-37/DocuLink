"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { RiLoader4Line } from "@remixicon/react";

const CollaborativeEditor = dynamic(
  () => Promise.resolve(import("./FirebaseEditor")),
  {
    ssr: false,
  },
);

import DocumentSidebar from "@/components/DocumentSidebar";

export default function DocPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const docId = params.id;

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !userId) {
      router.push('/sign-in');
    }
  }, [isLoaded, userId, router]);

  const handleRollback = useCallback((delta: unknown) => {
    window.dispatchEvent(new CustomEvent("apply-delta", { detail: { delta } }));
  }, []);

  // Show loading state while auth is loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RiLoader4Line className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign in to access this document.
          </p>
          <Button onClick={() => router.push('/sign-in')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="p-4">
        <CollaborativeEditor docId={docId} />
      </div>
      <DocumentSidebar docId={docId} onRollback={handleRollback} />
    </div>
  );
}
