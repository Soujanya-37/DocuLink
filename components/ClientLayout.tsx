"use client";

import { ClientOnly } from "@/components/ClientOnly";
import FirebaseAuthSync from "@/components/FirebaseAuthSync";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import { ThemeProvider } from "@/components/ThemeProvider";
import Pwa from "@/components/Pwa";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <FirebaseAuthSync />
        <Pwa />
        <Header />
        <Navigation />
        {children}
      </ThemeProvider>
    </ClientOnly>
  );
}
