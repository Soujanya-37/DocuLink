"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RiCheckLine, RiCloseLine, RiMailLine, RiRefreshLine } from "@remixicon/react";
import type { InviteData } from "@/lib/firestore-types";
import { Badge } from "@/components/ui/badge";

interface PendingInvite {
  documentId: string;
  documentTitle: string;
  invite: InviteData;
}

type ProcessingAction = 'accept' | 'reject';

export default function PendingInvites() {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingInvites, setProcessingInvites] = useState<Map<string, ProcessingAction>>(new Map());

  const fetchPendingInvites = useCallback(async () => {
    try {
      const response = await fetch("/api/invites/pending", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setInvites(data.invites || []);
      } else {
        console.error("Failed to fetch pending invites:", response.status);
      }
    } catch (error) {
      console.error("Error fetching pending invites:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingInvites();

    // Poll for new invites every 30 seconds
    const interval = setInterval(fetchPendingInvites, 30000);

    return () => clearInterval(interval);
  }, [fetchPendingInvites]);

  const handleAcceptInvite = async (documentId: string) => {
    // Prevent multiple clicks on the same invite
    if (processingInvites.has(documentId)) return;
    
    setProcessingInvites(prev => new Map(prev).set(documentId, 'accept'));
    try {
      const response = await fetch(`/api/documents/${documentId}/accept-invite`, {
        method: "POST",
        credentials: "include",
      });
      
      if (response.ok) {
        // Remove the accepted invite from the list immediately
        setInvites(prev => prev.filter(invite => invite.documentId !== documentId));
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to accept invite:", errorData.error || response.statusText);
        // Optionally show an error message to the user
      }
    } catch (error) {
      console.error("Error accepting invite:", error);
    } finally {
      setProcessingInvites(prev => {
        const newMap = new Map(prev);
        newMap.delete(documentId);
        return newMap;
      });
    }
  };

  const handleRejectInvite = async (documentId: string) => {
    // Prevent multiple clicks on the same invite
    if (processingInvites.has(documentId)) return;
    
    setProcessingInvites(prev => new Map(prev).set(documentId, 'reject'));
    try {
      const response = await fetch(`/api/documents/${documentId}/reject-invite`, {
        method: "POST",
        credentials: "include",
      });
      
      if (response.ok) {
        // Remove the rejected invite from the list immediately
        setInvites(prev => prev.filter(invite => invite.documentId !== documentId));
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to reject invite:", errorData.error || response.statusText);
        // Optionally show an error message to the user
      }
    } catch (error) {
      console.error("Error rejecting invite:", error);
    } finally {
      setProcessingInvites(prev => {
        const newMap = new Map(prev);
        newMap.delete(documentId);
        return newMap;
      });
    }
  };

  const formatMaybeTimestamp = (value: any): string => {
    try {
      if (!value) return "";
      if (typeof value === 'string' || typeof value === 'number') {
        return format(new Date(value), "MMM d, yyyy");
      }
      if (typeof value === 'object') {
        if (typeof value.toDate === 'function') return format(value.toDate(), "MMM d, yyyy");
        if (value._seconds) return format(new Date(value._seconds * 1000), "MMM d, yyyy");
      }
    } catch {}
    return "";
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3 text-xl">
            <RiMailLine className="h-5 w-5" />
            Pending Invites
            <Badge variant="secondary" className="text-sm">
              0
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RiRefreshLine className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invites.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-3">
              <CardTitle className="text-xl flex items-center gap-3">
                <RiMailLine className="h-5 w-5" />
                Pending Invites
                <Badge variant="secondary" className="text-sm">
                  0
                </Badge>
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchPendingInvites}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RiRefreshLine className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-base">
            You have been invited to collaborate on these documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-2">
              No pending invites
            </div>
            <p className="text-sm text-muted-foreground">
              Invitations to collaborate will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-3">
            <CardTitle className="text-xl flex items-center gap-3">
              <RiMailLine className="h-5 w-5" />
              Pending Invites
              <Badge variant="secondary" className="text-sm">
                {invites.length}
              </Badge>
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchPendingInvites}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RiRefreshLine className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-base">
          You have been invited to collaborate on these documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invites.map((invite) => {
            const processingAction = processingInvites.get(invite.documentId);
            const isProcessing = processingAction !== undefined;
            
            return (
              <div
                key={invite.documentId}
                className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-base truncate">
                    {invite.documentTitle}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Invited {formatMaybeTimestamp(invite.invite.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptInvite(invite.documentId)}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processingAction === 'accept' ? (
                      <RiRefreshLine className="h-3 w-3 animate-spin" />
                    ) : (
                      <RiCheckLine className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRejectInvite(invite.documentId)}
                    disabled={isProcessing}
                  >
                    {processingAction === 'reject' ? (
                      <RiRefreshLine className="h-3 w-3 animate-spin" />
                    ) : (
                      <RiCloseLine className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
