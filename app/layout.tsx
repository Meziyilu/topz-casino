// app/layout.tsx
import './styles/globals.css';
import './styles/auth-theme.css';

export const metadata = {
  title: 'TOPZCASINO',
  description: 'Casino platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      {/* 注意：不要在這裡做任何條件/隨機 render，保持靜態 */}
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
