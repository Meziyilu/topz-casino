import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fullstack Render Template",
  description: "Next.js + Prisma + JWT cookie on Render"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
