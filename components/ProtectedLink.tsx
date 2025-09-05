// components/ProtectedLink.tsx
'use client';

import { useState } from 'react';

export default function ProtectedLink({
  href,
  children,
  className,
}: { href: string; children: React.ReactNode; className?: string }) {
  const [loading, setLoading] = useState(false);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const me = await fetch('/api/users/me', { credentials: 'include' });
      if (me.ok) {
        window.location.assign(href); // 直接硬轉址
      } else {
        const next = encodeURIComponent(href);
        window.location.assign(`/login?next=${next}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <a href={href} onClick={onClick} className={className} aria-busy={loading}>
      {children}
    </a>
  );
}
