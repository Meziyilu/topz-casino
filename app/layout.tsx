import "./style/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Topzcasino",
  description: "Topzcasino v1.1.2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
