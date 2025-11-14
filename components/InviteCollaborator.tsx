"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RiLoader4Line } from "@remixicon/react";

export default function InviteCollaborator({ docId }: { docId: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const invite = async () => {
    if (!email.trim()) return;

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/documents/${docId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to invite");
      setMessage("Invitation sent successfully!");
      setEmail("");
    } catch (_e) {
      setMessage("Error sending invite. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-base">Invite Collaborators</h3>
      <div className="flex gap-2">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="flex-1"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              invite();
            }
          }}
        />
        <Button
          type="button"
          onClick={invite}
          disabled={loading || !email.trim()}
          size="sm"
        >
          {loading ? (
            <RiLoader4Line className="h-3 w-3 animate-spin" />
          ) : (
            "Invite"
          )}
        </Button>
      </div>
      {message && (
        <div className={`text-sm ${message.includes('Error') ? 'text-destructive' : 'text-green-600'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
