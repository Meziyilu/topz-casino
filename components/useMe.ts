// components/useMe.ts
"use client";

import { useCallback, useEffect, useState } from "react";

export type Me = {
  id: string;
  displayName?: string;
  name?: string | null;
  avatarUrl?: string | null;
  balance?: number;
  bankBalance?: number;
  isAdmin?: boolean;
};

async function fetchMeOnce(): Promise<Me | null> {
  // 先嘗試 /api/profile/me（v1.1.2 建議路由）
  try {
    const r1 = await fetch("/api/profile/me", { cache: "no-store", credentials: "include" });
    if (r1.ok) {
      const j = await r1.json();
      // 常見返回格式：{ user: {...} } 或直接 {...}
      return (j?.user ?? j) as Me;
    }
  } catch {}
  // 退回 /api/users/me（有些專案用這條）
  try {
    const r2 = await fetch("/api/users/me", { cache: "no-store", credentials: "include" });
    if (r2.ok) {
      const j = await r2.json();
      return (j?.user ?? j) as Me;
    }
  } catch {}
  return null;
}

export function useMe(pollMs = 0) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await fetchMeOnce();
    setMe(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(reload, pollMs);
    return () => clearInterval(t);
  }, [pollMs, reload]);

  return { me, loading, reload };
}
