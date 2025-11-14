"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewDocPage() {
  const router = useRouter();

  const handleCreate = async () => {
    const res = await fetch("/api/documents", { method: "POST" });
    if (!res.ok) return;
    const { id } = await res.json();
    router.push(`/docs/${id}`);
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Create New Document</CardTitle>
          <CardDescription>Start a new collaborative document</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={handleCreate} size="lg" className="w-full">
            Create Document
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
