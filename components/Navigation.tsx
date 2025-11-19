"use client";

import {
  RiArrowRightSLine,
  RiFileTextLine,
  RiHomeLine,
  RiEditLine,
  RiCheckLine,
  RiCloseLine,
} from "@remixicon/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { useAuth } from "@clerk/nextjs";

export default function Navigation() {
  const pathname = usePathname();
  const { userId } = useAuth();
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch document title if we're on a document page
  useEffect(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] === "docs" && segments[1] && segments[1] !== "[id]") {
      const docId = segments[1];
      setDocumentId(docId);
      const fetchDocumentTitle = async () => {
        try {
          const docRef = doc(db, "documents", docId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setDocumentTitle(data.title || "Untitled Document");
            
            // Check if user can edit (owner or collaborator)
            if (userId) {
              const hasAccess = data.ownerId === userId || (data.collaborators || []).includes(userId);
              setCanEdit(hasAccess);
            }
          } else {
            setDocumentTitle("Document Not Found");
            setCanEdit(false);
          }
        } catch (error) {
          console.error("Error fetching document title:", error);
          setDocumentTitle("Document");
          setCanEdit(false);
        }
      };
      fetchDocumentTitle();
    } else {
      setDocumentTitle(null);
      setDocumentId(null);
      setCanEdit(false);
    }
  }, [pathname]);

  const handleEditClick = () => {
    if (!documentTitle || !documentId) return;
    setEditTitle(documentTitle);
    setIsEditing(true);
  };

  const handleSaveTitle = async () => {
    if (!documentId || !userId || !editTitle.trim()) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editTitle.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update document title");
      }

      const result = await response.json();
      setDocumentTitle(result.title);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating document title:", error);
      // Revert to original title on error
      setEditTitle(documentTitle || "");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle("");
  };

  // Don't show navigation on the landing page
  if (pathname === "/") return null;

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const path = `/${segments.slice(0, i + 1).join("/")}`;

      if (segment === "dashboard") {
        breadcrumbs.push({ label: "Dashboard", path, icon: null, editable: false });
      } else if (segment === "docs") {
        // Skip adding "Documents" as a separate breadcrumb
        continue;
      } else if (segment === "new") {
        breadcrumbs.push({ label: "New Document", path, icon: null, editable: false });
      } else if (segment !== "[id]" && segment.length > 0) {
        // This is likely a document ID - use the fetched title or fallback
        const title = documentTitle || "Document";
        breadcrumbs.push({ 
          label: title, 
          path, 
          icon: RiFileTextLine, 
          editable: true,
          isDocument: true 
        });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground px-4 py-2 border-b-2 border-foreground bg-muted">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/">
          <RiHomeLine className="h-4 w-4" />
        </Link>
      </Button>

      {breadcrumbs.map((breadcrumb, index) => (
        <div key={breadcrumb.path} className="flex items-center">
          <RiArrowRightSLine className="h-4 w-4 mr-2" />
          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-foreground flex items-center gap-2 group">
              {breadcrumb.icon && (
                <breadcrumb.icon className="h-4 w-4 inline" />
              )}
              {breadcrumb.editable && breadcrumb.isDocument && isEditing ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-6 text-sm w-48 border-2 border-foreground"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveTitle();
                      } else if (e.key === "Escape") {
                        handleCancelEdit();
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveTitle}
                    disabled={isUpdating}
                    className="h-6 w-6 p-0"
                    title="Save changes"
                  >
                    {isUpdating ? (
                      <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                    ) : (
                      <RiCheckLine className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                    className="h-6 w-6 p-0"
                    title="Cancel editing"
                  >
                    <RiCloseLine className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span>{breadcrumb.label}</span>
                  {breadcrumb.editable && breadcrumb.isDocument && canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEditClick}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Edit document title"
                    >
                      <RiEditLine className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </span>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href={breadcrumb.path}>
                {breadcrumb.icon && (
                  <breadcrumb.icon className="h-4 w-4 mr-1" />
                )}
                {breadcrumb.label}
              </Link>
            </Button>
          )}
        </div>
      ))}
    </nav>
  );
}
