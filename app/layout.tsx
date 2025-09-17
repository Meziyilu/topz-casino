// app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head>
        {/* 載入商店 / 頭框 / 銀行的樣式 */}
        <link rel="stylesheet" href="/styles/shop.css" />
        <link rel="stylesheet" href="/styles/headframes.css" />
        <link rel="stylesheet" href="/styles/bank.css" />
      </head>
      <body>
        {children}

        {/* afterInteractive：等可互動再載，避免阻塞渲染，也不會有 preload 警告 */}
        <Script
          id="tawk-embed"
          src="https://embed.tawk.to/68b349c7d19aeb19234310df/1j3u5gcnb"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
