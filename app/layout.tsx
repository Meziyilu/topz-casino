// app/layout.tsx
export const metadata = {
  title: 'TOPZCASINO',
  description: 'Casino platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
