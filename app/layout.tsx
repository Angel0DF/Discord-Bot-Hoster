import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proxmox Discord Bot Hoster | Dashboard",
  description: "Piattaforma self-hosted per ospitare, gestire e monitorare i tuoi bot Discord su Proxmox VE",
  icons: {
    icon: "/favicon.ico",
  },
};

import { UploadProvider } from "@/context/upload-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <body className="min-h-screen bg-[#08090d] text-zinc-100 antialiased selection:bg-indigo-500 selection:text-white">
        <UploadProvider>{children}</UploadProvider>
      </body>
    </html>
  );
}

