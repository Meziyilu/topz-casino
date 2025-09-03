// app/(public)/layout.tsx
import '@/app/(public)/auth-theme.css';
import Image from 'next/image';
import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      {/* 背景動畫層（低調） */}
      <div className="auth-bg" aria-hidden>
        <div className="auth-blob b1" />
        <div className="auth-blob b2" />
      </div>
      <div className="auth-grain" aria-hidden />

      {/* Header（極簡） */}
      <header className="auth-header">
        <Link href="/" className="auth-brand" aria-label="Topzcasino Home">
          <Image src="/logo.svg" alt="" width={24} height={24} />
          <span>Topzcasino</span>
        </Link>
        <nav>
          <Link href="/login" className="link">登入</Link>
          <span style={{ margin: '0 8px', opacity: .35 }}>·</span>
          <Link href="/register" className="link">註冊</Link>
        </nav>
      </header>

      <main className="auth-main">{children}</main>
    </div>
  );
}
