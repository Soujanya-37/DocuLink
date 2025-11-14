"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ShareAccess({ docId }: { docId: string }) {
  const [shareKey, setShareKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const sp = useSearchParams();

  const generate = async () => {
    setStatus("");
    setCopied(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${docId}/share`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setStatus("Failed to generate share key");
        return;
      }
      const { shareKey } = await res.json();
      setShareKey(shareKey);
      setStatus("Share link generated");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const key = sp.get("key");
    if (!key) return;
    const join = async () => {
      const res = await fetch(`/api/documents/${docId}/join-with-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key }),
      });
      if (res.ok) setStatus("Joined via key");
      else setStatus("Invalid or expired key");
    };
    void join();
  }, [docId, sp]);

  const shareUrl = shareKey
    ? `${window.location.origin}/docs/${docId}?key=${shareKey}`
    : "";

  const copy = async () => {
    try {
      if (!shareUrl) return;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setStatus("Copied link to clipboard");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setStatus("Copy failed");
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Share Access</h3>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={generate}
          disabled={loading}
        >
          {loading ? "Generating…" : "Generate Share Link"}
        </Button>
        {shareKey && (
          <Button type="button" variant="outline" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        )}
      </div>
      {shareKey && (
        <div className="text-sm">
          <div className="break-all">{shareUrl}</div>
        </div>
      )}
      {status && <div className="text-sm text-gray-600">{status}</div>}
    </div>
  );
}
