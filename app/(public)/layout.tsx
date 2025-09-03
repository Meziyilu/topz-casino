// app/(public)/layout.tsx
import '@/app/(public)/auth-theme.css';
import Image from 'next/image';
import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      {/* 背景動畫層 */}
      <div className="auth-bg" aria-hidden>
        <div className="auth-blob b1" />
        <div className="auth-blob b2" />
        <div className="auth-blob b3" />
      </div>
      <div className="auth-grain" aria-hidden />

      {/* Header（Logo/品牌列） */}
      <header className="auth-header">
        <Link href="/" className="auth-brand">
          <Image src="/logo.svg" alt="Topzcasino" width={28} height={28} />
          <span>Topzcasino</span>
        </Link>
        <nav>
          <Link href="/login" className="link">登入</Link>
          <span style={{ margin: '0 10px', opacity: .4 }}>•</span>
          <Link href="/register" className="link">註冊</Link>
        </nav>
      </header>

      <main className="auth-main">{children}</main>
    </div>
  );
}
