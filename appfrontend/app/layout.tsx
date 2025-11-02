import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ClientWrapper from "@/components/ClientWrapper";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MeetApp Proctoring",
  description: "Secure meeting & proctoring system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientWrapper>{children}</ClientWrapper>
        <Toaster />
      </body>
    </html>
  );
}
