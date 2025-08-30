// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "TOPZ Casino",
  description: "Entertainment lobby",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body>
        {/* 將需要 hooks 的主題邏輯放到 Client 元件 */}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
