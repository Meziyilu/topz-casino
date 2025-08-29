// app/layout.tsx
import "./globals.css";
import React, { type ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TOPZCASINO",
  description: "Entertainment lobby",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body className="min-h-dvh bg-[#0b0f1a] text-white">
        {children}
      </body>
    </html>
  );
}
