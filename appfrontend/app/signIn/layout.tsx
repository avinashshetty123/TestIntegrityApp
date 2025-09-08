import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner"



export const metadata: Metadata = {
  title: "SignIn Page",
  description: "Please SignIn",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <section className="flex justify-center items-center min-h-screen bg-black">
      <Toaster/>
      {children}
    </section>
  );
}
