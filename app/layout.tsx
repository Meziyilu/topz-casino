import "./globals.css";
import NavBar from "@/components/NavBar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="bg-[#0a0f1a]">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
