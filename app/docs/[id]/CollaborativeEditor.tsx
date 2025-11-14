"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import "quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button";

export default function CollaborativeEditor({ docId }: { docId: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const { isSignedIn, userId } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;
    let provider: WebsocketProvider | null = null;
    let ydoc: Y.Doc | null = null;
    let binding: any = null;

    const setup = async () => {
      if (typeof window === "undefined") return;

      const [{ default: Quill }, { QuillBinding }] = await Promise.all([
        import("quill"),
        import("y-quill"),
      ]);
      // Try to load cursors module for live presence
      try {
        const { default: QuillCursors } = await import("quill-cursors");
        Quill.register("modules/cursors", QuillCursors);
      } catch (err) {
        console.warn("quill-cursors not available", err);
      }

      const editorEl = document.createElement("div");
      if (!containerRef.current) return;
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(editorEl);

      const quill = new Quill(editorEl, {
        theme: "snow",
        modules: {
          // Live cursors (if quill-cursors is registered above)
          cursors: true,
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "blockquote", "code-block"],
            ["clean"],
          ],
        },
      });

      ydoc = new Y.Doc();
      provider = new WebsocketProvider(
        "wss://demos.yjs.dev",
        `doc-${docId}`,
        ydoc,
      );
      const ytext = ydoc.getText("quill");

      binding = new QuillBinding(ytext, quill, provider.awareness);

      // Set awareness user info for better cursor labels/colors
      try {
        provider.awareness.setLocalStateField("user", {
          name: userId ?? "anonymous",
          color: `hsl(${Math.abs((userId ?? "anon").split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 360}, 70%, 50%)`,
        });
      } catch {}

      quillRef.current = quill as any;
      setIsReady(true);

      const onApplyDelta = (e: Event) => {
        const custom = e as CustomEvent;
        const delta = custom.detail?.delta;
        if (delta && quillRef.current) {
          quillRef.current.setContents(delta);
        }
      };
      window.addEventListener("apply-delta", onApplyDelta as EventListener);

      return () => {
        window.removeEventListener(
          "apply-delta",
          onApplyDelta as EventListener,
        );
        binding?.destroy?.();
        provider?.destroy();
        ydoc?.destroy();
      };
    };

    const cleanupPromise = setup();
    return () => {
      void cleanupPromise;
    };
  }, [docId, isSignedIn, userId]);

  const handleSaveSnapshot = async () => {
    if (!quillRef.current) return;
    const delta = (quillRef.current as any).getContents();
    const response = await fetch(`/api/documents/${docId}/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ delta }),
    });
    if (!response.ok) {
      try {
        const detail = await response.text();
        console.error("Failed to save snapshot", response.status, detail);
      } catch {
        console.error("Failed to save snapshot", response.status);
      }
      return;
    }
    const result = await response.json();
    console.log("Snapshot saved:", result);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {isReady ? "Connected" : "Connecting..."}
        </div>
        <Button
          type="button"
          onClick={handleSaveSnapshot}
        >
          Save Snapshot
        </Button>
      </div>
      <div ref={containerRef} className="min-h-[400px]" />
    </div>
  );
}
