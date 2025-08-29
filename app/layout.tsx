// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TOPZCASINO",
  description: "Entertainment lobby",
};

export const viewport: Viewport = {
  themeColor: "#0b0f1a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-casino-bg text-white antialiased">
        {children}
        {/* 可選：Portal root 給彈窗/公告 */}
        <div id="portal-root" />
      </body>
    </html>
  );
}
