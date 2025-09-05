import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ClientWrapper from "@/components/ClientWrapper"; // ✅ only import client wrapper

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
      </body>
    </html>
  );
}
