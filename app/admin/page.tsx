// app/admin/page.tsx
"use client";

import useSWR from "swr";
import { useState } from "react";

const fetcher = (u: string) =>
  fetch(u, { credentials: "include", cache: "no-store" }).then((r) => r.json());

export default function AdminPage() {
  const { data: me } = useSWR("/api/auth/me", fetcher);
  const isAdmin = !!me?.isAdmin;

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onResetAll = async () => {
    if (!confirm("確定要重置所有房間與當日回合？此動作會清空下注/回合/房間！")) return;
    try {
      setBusy(true);
      setMsg(null);
      const res = await fetch("/api/admin/rooms/reset", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "重置失敗");
      setMsg(j?.message || "重置完成");
    } catch (e: any) {
      setMsg(e.message || "重置失敗");
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-white">
        需要管理員權限
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] p-6 md:p-10 text-white bg-gradient-to-b from-[#0a0f1a] to-[#0b1020]">
      <style jsx global>{`
        .panel { background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04)); border: 1px solid rgba(255,255,255,.15); backdrop-filter: blur(12px); border-radius: 16px; }
        .btn { padding: 10px 14px; border-radius: 12px; font-weight: 700; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2); transition: transform .05s ease, background .2s ease; }
        .btn:hover { background: rgba(255,255,255,.16); }
        .btn:active { transform: scale(.98); }
        .btn-warn { background: linear-gradient(180deg, #f97316, #ea580c); border-color: rgba(0,0,0,.25); }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold">管理員面板</h1>

        <div className="panel p-5 space-y-4">
          <div className="text-lg font-bold">重置房間</div>
          <p className="opacity-80 text-sm">
            這會清空 <b>所有房間、回合、下注、帳本</b>，並重建 R30 / R60 / R90 各自的首局（下注中）。
          </p>
          <button className="btn btn-warn" onClick={onResetAll} disabled={busy}>
            {busy ? "重置中…" : "重置所有房間"}
          </button>
          {msg && <div className="mt-2 text-sm opacity-90">{msg}</div>}
        </div>
      </div>
    </div>
  );
}
