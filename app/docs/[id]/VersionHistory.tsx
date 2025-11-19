"use client";

import { format } from "date-fns";
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AnyVersionMeta {
  versionId: string;
  // legacy
  createdAt?: any;
  fileKey?: string;
  createdByUserId?: string;
  // new
  timestamp?: string;
  s3Key?: string;
  createdBy?: string;
  // optional
  commitMessage?: string;
}

export default function VersionHistory({
  docId,
  onRollback,
}: {
  docId: string;
  onRollback: (delta: unknown) => void;
}) {
  const [versions, setVersions] = useState<AnyVersionMeta[]>([]);
  const [reverting, setReverting] = useState<AnyVersionMeta | null>(null);
  const [revertMessage, setRevertMessage] = useState("");
  const [isReverting, setIsReverting] = useState(false);
  const [diffOpen, setDiffOpen] = useState<AnyVersionMeta | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffText, setDiffText] = useState("");
  const [userProfiles, setUserProfiles] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const colRef = collection(db, "documents", docId, "versions");
    const unsub = onSnapshot(colRef, (snap) => {
      const items: AnyVersionMeta[] = [];
      snap.docs.forEach((d) => {
        items.push(d.data() as AnyVersionMeta);
      });
      // Sort client-side by createdAt (Timestamp) or timestamp (ISO)
      items.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? (a.timestamp ? Date.parse(a.timestamp) : 0);
        const bTime = b.createdAt?.toMillis?.() ?? (b.timestamp ? Date.parse(b.timestamp) : 0);
        return bTime - aTime;
      });
      setVersions(items);
    });
    return () => unsub();
  }, [docId]);

  // Resolve user profiles for author display (supports both createdByUserId and UID-like createdBy)
  useEffect(() => {
    const isLikelyUserId = (s: unknown): s is string => {
      if (typeof s !== 'string') return false;
      if (!s) return false;
      if (s.startsWith('user_') || s.startsWith('usr_') || s.startsWith('clerk_')) return true;
      // Generic long token without spaces/email
      if (s.length >= 20 && !s.includes('@') && !s.includes(' ')) return true;
      return false;
    };

    const ids = Array.from(new Set(
      versions.flatMap((v) => {
        const list: string[] = [];
        if (v.createdByUserId) list.push(v.createdByUserId);
        if (isLikelyUserId(v.createdBy)) list.push(v.createdBy as string);
        return list;
      })
    ));
    if (ids.length === 0) return;
    const load = async () => {
      try {
        const res = await fetch('/api/users/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ids })
        });
        if (!res.ok) return;
        const data = await res.json();
        const map = new Map<string, any>();
        for (const p of data.profiles || []) map.set(p.id, p);
        setUserProfiles(map);
      } catch {}
    };
    void load();
  }, [versions]);

  const handleRollback = async (key: string | undefined) => {
    if (!key) return;
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fileKey: key }),
    });
    if (!res.ok) return;
    const { downloadUrl } = await res.json();
    const delta = await fetch(downloadUrl).then((r) => r.json());
    onRollback(delta);
  };

  const openDiff = async (v: AnyVersionMeta) => {
    setDiffOpen(v);
    setDiffText("");
    setDiffLoading(true);
    try {
      // Fetch current document text via latest version (if any) or empty
      const current = versions[0];
      const currentKey = current?.s3Key ?? current?.fileKey;
      let currentDelta: any = null;
      if (currentKey) {
        const res = await fetch('/api/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ fileKey: currentKey }) });
        if (res.ok) {
          const { downloadUrl } = await res.json();
          currentDelta = await fetch(downloadUrl).then(r => r.json());
        }
      }
      const prevKey = v.s3Key ?? v.fileKey;
      let prevDelta: any = null;
      if (prevKey) {
        const res = await fetch('/api/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ fileKey: prevKey }) });
        if (res.ok) {
          const { downloadUrl } = await res.json();
          prevDelta = await fetch(downloadUrl).then(r => r.json());
        }
      }

      const deltaToText = (d: any): string => {
        try {
          const ops = Array.isArray(d?.ops) ? d.ops : d;
          if (!Array.isArray(ops)) return '';
          return ops.map((o: any) => typeof o.insert === 'string' ? o.insert : ' ').join('');
        } catch { return ''; }
      };

      const currentText = deltaToText(currentDelta);
      const previousText = deltaToText(prevDelta);

      const resp = await fetch('/api/ai/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentText, previousText, meta: { versionId: v.versionId } })
      });
      if (!resp.ok) {
        setDiffText('Failed to analyze differences.');
      } else {
        const { analysis } = await resp.json();
        setDiffText(analysis || 'No analysis.');
      }
    } catch (e) {
      setDiffText('Error analyzing differences.');
    } finally {
      setDiffLoading(false);
    }
  };

  const openRevert = (v: AnyVersionMeta) => {
    setReverting(v);
    setRevertMessage(`Revert to ${v.versionId.slice(0, 8)}`);
  };

  const confirmRevert = async () => {
    if (!reverting) return;
    setIsReverting(true);
    try {
      const key = reverting.s3Key ?? reverting.fileKey;
      if (!key) return;
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fileKey: key }),
      });
      if (!res.ok) return;
      const { downloadUrl } = await res.json();
      const delta = await fetch(downloadUrl).then((r) => r.json());

      // Apply locally
      onRollback(delta);

      // Create a snapshot with revert commit message
      await fetch(`/api/documents/${docId}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ delta, commitMessage: revertMessage.trim() || `Revert to ${reverting.versionId.slice(0,8)}` }),
      });

      setReverting(null);
      setRevertMessage("");
    } finally {
      setIsReverting(false);
    }
  };

  const formatWhen = (v: AnyVersionMeta) => {
    try {
      if (v.createdAt?.toDate) return format(v.createdAt.toDate(), "PPpp");
      if (v.timestamp) return format(new Date(v.timestamp), "PPpp");
    } catch {}
    return "";
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Version History</h3>
      <ul className="space-y-2">
        {versions.map((v) => (
          <li
            key={v.versionId}
            className="flex items-center justify-between border p-2 rounded"
          >
            <div className="text-sm">
              <div className="flex items-center gap-2">
                <span>Version: {v.versionId.slice(0, 8)}</span>
                {v.commitMessage ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-muted">
                    {v.commitMessage}
                  </span>
                ) : null}
              </div>
              <div className="text-gray-500 text-xs">
                {formatWhen(v)}{
                  (() => {
                    const isLikelyUserId = (s: unknown): s is string => {
                      if (typeof s !== 'string') return false;
                      if (!s) return false;
                      if (s.startsWith('user_') || s.startsWith('usr_') || s.startsWith('clerk_')) return true;
                      if (s.length >= 20 && !s.includes('@') && !s.includes(' ')) return true;
                      return false;
                    };
                    let label = '';
                    if (v.createdByUserId) {
                      label = userProfiles.get(v.createdByUserId)?.name || (typeof v.createdBy === 'string' && !isLikelyUserId(v.createdBy) ? v.createdBy : '');
                    } else if (isLikelyUserId(v.createdBy)) {
                      const id = v.createdBy as string;
                      label = userProfiles.get(id)?.name || '';
                    } else if (typeof v.createdBy === 'string') {
                      label = v.createdBy;
                    }
                    return label ? ` • by ${label}` : '';
                  })()
                }
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => openDiff(v)}
                size="sm"
                variant="outline"
              >
                Preview
              </Button>
              <Button
                type="button"
                onClick={() => openRevert(v)}
                size="sm"
                variant="destructive"
              >
                Revert
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={!!reverting} onOpenChange={(open) => !open && setReverting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revert document</DialogTitle>
            <DialogDescription>
              This will create a new snapshot with the content from the selected version.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="revert-message" className="text-sm font-medium">Commit message</label>
              <Textarea
                id="revert-message"
                value={revertMessage}
                onChange={(e) => setRevertMessage(e.target.value)}
                rows={3}
                placeholder="Describe why you're reverting..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReverting(null)} disabled={isReverting}>
              Cancel
            </Button>
            <Button onClick={confirmRevert} disabled={isReverting || !revertMessage.trim()}>
              {isReverting ? "Reverting..." : "Confirm Revert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diff Analysis Dialog */}
      <Dialog open={!!diffOpen} onOpenChange={(open) => !open && setDiffOpen(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Changes since {diffOpen?.versionId.slice(0,8)}</DialogTitle>
            <DialogDescription>
              AI-generated explanation of differences between this version and current content.
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none max-h-[60vh] overflow-auto">
            {diffLoading ? (
              <div className="bg-muted p-3 rounded text-sm">Analyzing…</div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {diffText || 'No differences detected.'}
              </ReactMarkdown>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiffOpen(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
