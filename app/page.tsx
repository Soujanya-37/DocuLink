"use client";

import {
  RiArrowRightLine,
  RiFileTextLine,
  RiFlashlightLine,
  RiGitBranchLine,
  RiGlobalLine,
  RiShieldCheckLine,
  RiTeamLine,
  RiMagicLine,
  RiUserLine,
} from "@remixicon/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";


export default function LandingPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="min-h-screen relative overflow-hidden border-b-4 border-primary">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-24 pb-32">
          <div className="flex justify-center">
            {/* Hero Content */}
            <div className="space-y-8 max-w-3xl">
              <div className="inline-block border-2 border-foreground px-3 py-1 text-sm font-mono">
                REAL-TIME COLLABORATION
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold leading-none tracking-tight">
                DOCULINK
                <br />
                <span className="text-primary">VERSION CONTROL</span>
                <br />
                FOR TEAMS
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed font-light">
                Real-time editing|Version snapshots| Instant rollback| Built for teams who need more than basic docs.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" asChild>
                  <Link href="/dashboard" className="flex items-center">
                    START NOW
                    <RiArrowRightLine className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="border-2 border-foreground font-semibold" asChild>
                  <Link href="#features">FEATURES</Link>
                </Button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="py-24 bg-background border-b-4 border-foreground"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="mb-20">
            <div className="inline-block border-2 border-foreground px-3 py-1 text-sm font-mono mb-6">
              FEATURES
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 max-w-2xl">
              EVERYTHING YOU NEED
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl">
              Built for teams who need more than basic editing. Snapshots, diffs, rollbacks.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="border-2 border-foreground p-6 bg-muted hover:bg-muted/80 transition-colors">
              <div className="w-10 h-10 border-2 border-foreground flex items-center justify-center mb-4 bg-background">
                <RiTeamLine className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold mb-2">REAL-TIME</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Multiple users edit simultaneously with live cursors and instant sync
              </p>
            </div>

            <div className="border-2 border-foreground p-6 bg-muted hover:bg-muted/80 transition-colors">
              <div className="w-10 h-10 border-2 border-foreground flex items-center justify-center mb-4 bg-background">
                <RiMagicLine className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI TOOLS</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Summarize content and explain version diffs
              </p>
            </div>

            <div className="border-2 border-foreground p-6 bg-muted hover:bg-muted/80 transition-colors">
              <div className="w-10 h-10 border-2 border-foreground flex items-center justify-center mb-4 bg-background">
                <RiGitBranchLine className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold mb-2">VERSION CONTROL</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Commit changes with messages, track history, and rollback to any version
              </p>
            </div>

            <div className="border-2 border-foreground p-6 bg-muted hover:bg-muted/80 transition-colors">
              <div className="w-10 h-10 border-2 border-foreground flex items-center justify-center mb-4 bg-background">
                <RiShieldCheckLine className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold mb-2">SECURE</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enterprise-grade security with AWS S3 storage and Firebase authentication
              </p>
            </div>

            <div className="border-2 border-foreground p-6 bg-muted hover:bg-muted/80 transition-colors">
              <div className="w-10 h-10 border-2 border-foreground flex items-center justify-center mb-4 bg-background">
                <RiFileTextLine className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold mb-2">RICH EDITOR</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Powered by Quill editor with formatting, lists, and collaborative features
              </p>
            </div>

            <div className="border-2 border-foreground p-6 bg-muted hover:bg-muted/80 transition-colors">
              <div className="w-10 h-10 border-2 border-foreground flex items-center justify-center mb-4 bg-background">
                <RiUserLine className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold mb-2">LIVE PRESENCE</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                See collaborators' cursors and selections update in real time
              </p>
            </div>

            <div className="border-2 border-foreground p-6 bg-muted hover:bg-muted/80 transition-colors">
              <div className="w-10 h-10 border-2 border-foreground flex items-center justify-center mb-4 bg-background">
                <RiGlobalLine className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold mb-2">SHARE & INVITE</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Easy sharing with invite links and granular permission controls
              </p>
            </div>

            <div className="border-2 border-foreground p-6 bg-muted hover:bg-muted/80 transition-colors">
              <div className="w-10 h-10 border-2 border-foreground flex items-center justify-center mb-4 bg-background">
                <RiFlashlightLine className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold mb-2">FAST</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Built with Next.js and Y.js for optimal performance and real-time sync
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-foreground py-16 bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col items-center gap-4 justify-center">
            <p className="text-sm font-mono text-muted-foreground">COLLABORATIVE DOCS WITH VERSION CONTROL</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
