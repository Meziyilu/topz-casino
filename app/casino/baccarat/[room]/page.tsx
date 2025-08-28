"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { useCallback, useState } from "react";

const fetcher = (u: string) =>
  fetch(u, { credentials: "include", cache: "no-store" }).then((r) => r.json());

export default function RoomPage() {
  const params = useParams<{ room: string }>();
  const roomCode = String(params.room || "R60").toUpperCase();

  const { data: me } = useSWR("/api/auth/me", fetcher, { refreshInterval: 60000 });
  const isAdmin = !!me?.isAdmin;

  const { data, mutate } = useSWR(
    `/api/casino/baccarat/state?room=${roomCode}`,
    fetcher,
    { refreshInterval: 1000, dedupingInterval: 500, revalidateOnFocus: false }
  );

  const [busy, setBusy] = useState(false);
  const onRestart = useCallback(async () => {
    if (!confirm(`確定要重啟房間 ${roomCode} 的當局？`)) return;
    try {
      setBusy(true);
      const res = await fetch(`/api/casino/baccarat/state?room=${roomCode}&force=restart`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "重啟失敗");
      mutate(); // 立即刷新
      alert(`房間 ${roomCode} 已重啟為「下注中」`);
    } catch (e: any) {
      alert(e.message || "重啟失敗");
    } finally {
      setBusy(false);
    }
  }, [roomCode, mutate]);

  // 下面是你的原本畫面...
  return (
    <div className="min-h-[100dvh] text-white p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl font-extrabold">百家樂 - {roomCode}</div>
        {isAdmin && (
          <button
            onClick={onRestart}
            disabled={busy}
            className="px-3 py-2 rounded-lg font-bold border border-white/20 bg-gradient-to-b from-orange-400 to-orange-600"
          >
            {busy ? "重啟中…" : "重啟本房"}
          </button>
        )}
      </div>

      {/* 你原本的下注面板 / 開牌動畫 / 路子 等 */}
      {/* ... */}
    </div>
  );
}
