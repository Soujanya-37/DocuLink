"use client";

import { useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
//
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiHistoryLine,
  RiMailLine,
  RiShareLine,
  RiTeamLine,
  RiRefreshLine,
  RiUserAddLine,
} from "@remixicon/react";
import { format } from "date-fns";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState as useReactState } from "react";
import { db } from "@/lib/firebase-client";
import type { DocumentData } from "@/lib/firestore-types";
import InviteCollaborator from "@/components/InviteCollaborator";
import ShareAccess from "@/components/ShareAccess";
import VersionHistory from "@/app/docs/[id]/VersionHistory";

interface DocumentSidebarProps {
  docId: string;
  onRollback: (delta: unknown) => void;
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export default function DocumentSidebar({
  docId,
  onRollback,
}: DocumentSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "history" | "collaborators" | "invite" | "share" | "invites"
  >("history");
  const [documentData, setDocumentData] = useReactState<DocumentData | null>(
    null
  );
  const [collaborators, setCollaborators] = useReactState<Collaborator[]>([]);
  const [userProfiles, setUserProfiles] = useReactState<Map<string, any>>(
    new Map()
  );
  const [pendingInvites, setPendingInvites] = useReactState<any[]>([]);
  const { userId } = useAuth();
  const { user: currentUser } = useUser();
  // Fixed width sidebar (40rem)

  // Fetch user profiles from Clerk
  const fetchUserProfiles = async (userIds: string[]) => {
    try {
      const uniqueIds = Array.from(new Set(userIds));
      const res = await fetch("/api/users/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: uniqueIds }),
      });
      const profiles = new Map();
      if (res.ok) {
        const data = await res.json();
        for (const p of data.profiles || []) {
          profiles.set(p.id, p);
        }
      }
      return profiles;
    } catch (error) {
      console.error("Error fetching user profiles:", error);
      return new Map();
    }
  };

  // Fetch document data and collaborators
  useEffect(() => {
    const docRef = doc(db, "documents", docId);
    const unsub = onSnapshot(docRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as DocumentData;
        setDocumentData(data);

        // Fetch real collaborator profiles from Clerk
        const allUserIds = [data.ownerId, ...(data.collaborators || [])];
        const uniqueUserIds = [...new Set(allUserIds)];
        const profiles = await fetchUserProfiles(uniqueUserIds);
        setUserProfiles(profiles);

        // Create collaborator list with real data
        const collabList: Collaborator[] = [];
        uniqueUserIds.forEach((userId) => {
          const profile = profiles.get(userId);
          if (profile) {
            collabList.push({
              id: userId,
              name: profile.name,
              email: profile.email,
              imageUrl: profile.imageUrl,
              isOnline: Math.random() > 0.5, // TODO: Implement real online status
              lastSeen: new Date(Date.now() - Math.random() * 1000000),
            });
          }
        });

        setCollaborators(collabList);
      }
    });
    return () => unsub();
  }, [docId, currentUser, userId]);

  // Fetch pending invites for this document
  useEffect(() => {
    if (!userId || documentData?.ownerId !== userId) return;

    const fetchPendingInvites = async () => {
      try {
        const response = await fetch(
          `/api/documents/${docId}/invites/pending`,
          {
            credentials: "include",
          }
        );
        if (response.ok) {
          const data = await response.json();
          setPendingInvites(data.invites || []);
        }
      } catch (error) {
        console.error("Error fetching pending invites:", error);
      }
    };

    fetchPendingInvites();
  }, [docId, userId, documentData]);

  // Rollback is handled by VersionHistory which will call onRollback(delta)

  // Safe formatter for Firestore Timestamp | ISO string | epoch
  const formatMaybeTimestamp = (value: any): string => {
    try {
      if (!value) return "";
      if (typeof value === "string" || typeof value === "number") {
        return format(new Date(value), "MMM d, yyyy");
      }
      if (typeof value === "object") {
        if (typeof value.toDate === "function")
          return format(value.toDate(), "MMM d, yyyy");
        if (value._seconds)
          return format(new Date(value._seconds * 1000), "MMM d, yyyy");
      }
    } catch {}
    return "";
  };

  const tabs = [
    { id: "history", label: "Version History", icon: RiHistoryLine },
    { id: "collaborators", label: "Collaborators", icon: RiTeamLine },
    { id: "invites", label: "Manage Invites", icon: RiMailLine },
    { id: "invite", label: "Invite Someone", icon: RiUserAddLine },
    { id: "share", label: "Share", icon: RiShareLine },
  ] as const;

  if (isCollapsed) {
    return (
      <div className="fixed right-0 top-1/2 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="rounded-l-lg rounded-r-none border-r-0 shadow-lg"
        >
          <RiArrowLeftLine className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Click outside overlay closes the sidebar

  return (
    <>
      {/* Click-outside overlay */}
      <div
        className="fixed inset-0 z-30"
        onClick={() => setIsCollapsed(true)}
      />
      <div className="fixed right-0 top-[5rem] h-[calc(100%-5rem)] w-full sm:w-[28rem] md:w-[32rem] lg:w-[36rem] xl:w-[40rem] bg-background border-l border-border shadow-lg z-40 flex flex-col select-none">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Document Tools</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(true)}
          >
            <RiArrowRightLine className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap border-b">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-none border-b-2 ${
                activeTab === tab.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-transparent"
              }`}
            >
              <tab.icon className="h-4 w-4 mr-1" />
              <span className="text-xs">{tab.label}</span>
            </Button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "history" && (
            <VersionHistory docId={docId} onRollback={onRollback} />
          )}

          {activeTab === "collaborators" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Collaborators</h3>
                <Badge variant="secondary">{collaborators.length}</Badge>
              </div>
              {collaborators.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No collaborators yet
                </div>
              ) : (
                <div className="space-y-2">
                  {collaborators.map((collab) => (
                    <Card key={collab.id} className="p-3">
                      <CardContent className="p-0">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Avatar className="w-8 h-8">
                              <AvatarImage
                                src={collab.imageUrl}
                                alt={collab.name}
                              />
                              <AvatarFallback className="text-xs">
                                {collab.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {collab.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">
                                {collab.name}
                              </p>
                              {collab.id === documentData?.ownerId && (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-1 py-0"
                                >
                                  Owner
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {collab.email}
                            </p>
                            {collab.lastSeen && (
                              <p className="text-xs text-muted-foreground">
                                Last seen{" "}
                                {format(collab.lastSeen, "MMM d, h:mm a")}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={collab.isOnline ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {collab.isOnline ? "Online" : "Offline"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "invites" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Manage Invites</h3>
                  <Badge variant="secondary">{pendingInvites.length}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Refresh invites
                    if (documentData?.ownerId === userId) {
                      const fetchPendingInvites = async () => {
                        try {
                          const response = await fetch(
                            `/api/documents/${docId}/invites/pending`,
                            {
                              credentials: "include",
                            }
                          );
                          if (response.ok) {
                            const data = await response.json();
                            setPendingInvites(data.invites || []);
                          }
                        } catch (error) {
                          console.error(
                            "Error fetching pending invites:",
                            error
                          );
                        }
                      };
                      fetchPendingInvites();
                    }
                  }}
                >
                  <RiRefreshLine className="h-3 w-3" />
                </Button>
              </div>
              {pendingInvites.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No pending invitations
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingInvites.map((invite) => (
                    <Card key={invite.id || invite.email || Math.random()} className="p-3">

                      <CardContent className="p-0">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {invite.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Sent {formatMaybeTimestamp(invite.createdAt)}
                            </p>
                            {invite.expiresAt && (
                              <p className="text-xs text-muted-foreground">
                                Expires {formatMaybeTimestamp(invite.expiresAt)}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            Pending
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "invite" && (
            <div className="space-y-3">
              <InviteCollaborator docId={docId} />
            </div>
          )}

          {activeTab === "share" && (
            <div className="space-y-3">
              <ShareAccess docId={docId} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
