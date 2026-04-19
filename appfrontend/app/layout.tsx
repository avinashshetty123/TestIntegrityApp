import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ClientWrapper from "@/components/ClientWrapper";
import Navigation from "@/components/Navigation";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import ConditionalCursor from "@/components/ConditionalCursor";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TestIntegrity - AI-Powered Online Proctoring",
  description: "Secure online examination proctoring system with AI-powered monitoring",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Cursor-reactive spotlight */}
        <div id="cursor-spotlight" />

        {/* Ambient floating orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* App content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <ClientWrapper>
            <Navigation />
            <main className="page-enter">
              {children}
            </main>
          </ClientWrapper>
        </div>

        <ConditionalCursor />
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
