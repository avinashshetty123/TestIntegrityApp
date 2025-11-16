import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ClientWrapper from "@/components/ClientWrapper";
import Navigation from "@/components/Navigation";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TestIntegrity - AI-Powered Online Proctoring",
  description: "Secure online examination proctoring system with AI-powered monitoring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientWrapper>
         
          {children}
        </ClientWrapper>
        <Toaster />
      </body>
    </html>
  );
}
