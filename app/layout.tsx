import Script from "next/script";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head>
        {/* 這裡可以保留你原本的 meta / favicon / css link */}

        {/* 預先宣告全域變數（客服 SDK 用） */}
        <Script id="tawk-preinit" strategy="beforeInteractive">
          {`
            window.Tawk_API = window.Tawk_API || {};
            window.Tawk_LoadStart = new Date();
          `}
        </Script>

        {/* 載入 Tawk.to 客服腳本 */}
        <Script
          id="tawk-script"
          strategy="afterInteractive"
          src="https://embed.tawk.to/68b349c7d19aeb19234310df/1j3u5gcnb"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
