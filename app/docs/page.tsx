"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DocsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the dashboard
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
