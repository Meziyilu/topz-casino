// lib/useGuard.ts
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useGuard(nextPath: string) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/users/me', { credentials: 'include' });
        if (!r.ok) {
          router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
          return;
        }
        if (alive) setOk(true);
      } catch {
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      }
    })();
    return () => { alive = false; };
  }, [router, nextPath]);

  return ok;
}
