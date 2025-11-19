"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import {
  RiCloseLine,
  RiMenuLine,
  RiMailLine,
  RiCheckLine,
  RiCloseLine as RiXLine,
  RiRefreshLine,
  RiLoader4Line,
} from "@remixicon/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { InviteData } from "@/lib/firestore-types";

interface PendingInvite {
  documentId: string;
  documentTitle: string;
  invite: InviteData;
}

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);
  const pathname = usePathname();

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  // Fetch pending invites
  const fetchPendingInvites = useCallback(async () => {
    try {
      const response = await fetch("/api/invites/pending", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setInvites(data.invites || []);
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
    setProcessingInvite(documentId);
    try {
      const response = await fetch(
        `/api/documents/${documentId}/accept-invite`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (response.ok) {
        setInvites((prev) =>
          prev.filter((invite) => invite.documentId !== documentId)
        );
      }
    } catch (error) {
      console.error("Error accepting invite:", error);
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleRejectInvite = async (documentId: string) => {
    setProcessingInvite(documentId);
    try {
      const response = await fetch(
        `/api/documents/${documentId}/reject-invite`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (response.ok) {
        setInvites((prev) =>
          prev.filter((invite) => invite.documentId !== documentId)
        );
      }
    } catch (error) {
      console.error("Error rejecting invite:", error);
    } finally {
      setProcessingInvite(null);
    }
  };

  // Safe date formatter for Firestore Timestamp | ISO | epoch
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

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMobileMenuOpen && !target.closest("header")) {
        closeMobileMenu();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileMenuOpen, closeMobileMenu]);

  return (
    <header className="flex justify-center px-6 lg:px-12 py-4 border-b-4 border-foreground bg-background sticky top-0 z-50">
      <div className="container flex justify-between items-center">
        <Link
          href="/"
          className="text-xl font-bold hover:text-primary transition-colors flex items-center gap-3 border-2 border-foreground px-3 py-1.5 bg-muted"
        >
          <span className="hidden sm:inline font-mono">DOCULINK</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-2 items-center">
          <ThemeToggle />
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outline" className="border-2 border-foreground font-semibold">SIGN IN</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button className="border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">SIGN UP</Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            {(pathname === "/dashboard" || pathname.startsWith("/docs/")) && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative h-9 w-9 p-0"
                  >
                    <RiMailLine className="h-4 w-4" />
                    {invites.length > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs border-2"
                      >
                        {invites.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 border-4 border-foreground" align="end">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold font-mono">PENDING INVITES</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchPendingInvites}
                        disabled={loading}
                        className="h-6 w-6 p-0"
                      >
                        <RiRefreshLine
                          className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
                        />
                      </Button>
                    </div>
                    {loading ? (
                      <div className="flex items-center justify-center py-4">
                        <RiRefreshLine className="h-4 w-4 animate-spin" />
                      </div>
                    ) : invites.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No pending invites
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {invites.map((invite) => (
                          <div
                            key={invite.documentId}
                            className="flex items-center justify-between p-3 border-2 border-foreground bg-muted"
                          >
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-sm truncate">
                                {invite.documentTitle}
                              </h5>
                              <p className="text-xs text-muted-foreground">
                                {formatMaybeTimestamp(invite.invite.createdAt)}
                              </p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleAcceptInvite(invite.documentId)
                                }
                                disabled={
                                  processingInvite === invite.documentId
                                }
                                className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                              >
                                {processingInvite === invite.documentId ? (
                                  <RiLoader4Line className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RiCheckLine className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  handleRejectInvite(invite.documentId)
                                }
                                disabled={
                                  processingInvite === invite.documentId
                                }
                                className="h-6 w-6 p-0"
                              >
                                {processingInvite === invite.documentId ? (
                                  <RiLoader4Line className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RiXLine className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button variant="ghost" asChild className="border-2 border-foreground font-semibold">
              <Link href="/dashboard">DASHBOARD</Link>
            </Button>
            <UserButton />
          </SignedIn>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden flex items-center gap-2">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <RiCloseLine className="h-5 w-5" />
          ) : (
            <RiMenuLine className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b-4 border-foreground md:hidden">
          <div className="flex flex-col p-4 space-y-2">
            <div className="flex justify-center pb-2 border-b border-border">
              <ThemeToggle />
            </div>
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="outline" className="w-full justify-start border-2 border-foreground font-semibold">
                  SIGN IN
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button className="w-full justify-start border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">SIGN UP</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              {(pathname === "/dashboard" || pathname.startsWith("/docs/")) && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start relative"
                    >
                      <RiMailLine className="h-4 w-4 mr-2" />
                      Pending Invites
                      {invites.length > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-auto h-5 w-5 p-0 text-xs border-2"
                        >
                          {invites.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 border-4 border-foreground" align="start">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold font-mono">PENDING INVITES</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={fetchPendingInvites}
                          disabled={loading}
                          className="h-6 w-6 p-0"
                        >
                          <RiLoader4Line
                            className={`h-3 w-3 ${
                              loading ? "animate-spin" : ""
                            }`}
                          />
                        </Button>
                      </div>
                      {loading ? (
                        <div className="flex items-center justify-center py-4">
                          <RiLoader4Line className="h-4 w-4 animate-spin" />
                        </div>
                      ) : invites.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          No pending invites
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {invites.map((invite) => (
                            <div
                              key={invite.documentId}
                              className="flex items-center justify-between p-3 border-2 border-foreground bg-muted"
                            >
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-sm truncate">
                                  {invite.documentTitle}
                                </h5>
                                <p className="text-xs text-muted-foreground">
                                  {formatMaybeTimestamp(
                                    invite.invite.createdAt
                                  )}
                                </p>
                              </div>
                              <div className="flex gap-1 ml-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleAcceptInvite(invite.documentId)
                                  }
                                  disabled={
                                    processingInvite === invite.documentId
                                  }
                                  className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                                >
                                  {processingInvite === invite.documentId ? (
                                    <RiLoader4Line className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <RiCheckLine className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    handleRejectInvite(invite.documentId)
                                  }
                                  disabled={
                                    processingInvite === invite.documentId
                                  }
                                  className="h-6 w-6 p-0"
                                >
                                  {processingInvite === invite.documentId ? (
                                    <RiLoader4Line className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <RiXLine className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <Button
                variant="ghost"
                asChild
                className="w-full justify-start border-2 border-foreground font-semibold"
                onClick={closeMobileMenu}
              >
                <Link href="/dashboard">DASHBOARD</Link>
              </Button>
              <div className="flex justify-center pt-2">
                <UserButton />
              </div>
            </SignedIn>
          </div>
        </div>
      )}
    </header>
  );
}
