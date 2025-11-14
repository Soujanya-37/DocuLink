"use client"; // This directive is CRITICAL for Next.js App Router

import { useState, useEffect, ReactNode } from "react";

interface ClientOnlyProps {
  children: ReactNode;
}

export function ClientOnly({ children }: ClientOnlyProps) {
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client after initial server render/hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // During server render and initial hydration, render null to match server output
  if (!mounted) {
    return null;
  }

  // Once mounted on the client, render the children
  return <>{children}</>;
}

// Default export for compatibility
export default ClientOnly;