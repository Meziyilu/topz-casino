// app/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Me = {
  id: string;
  email: string;
  displayName: string;
  nickname?: string | null;
  about?: string | null;
  country?: string | null;
  avatarUrl?: string | null;
  vipTier: number;
  balance: number;
  bankBalance: number;
  headframe?: string | null;   // 如果是 enum，這裡只是顯示字串即可
  panelStyle?: string | null;  // 同上
  panelTint?: string | null;
};

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/profile/me", { credentials: "include" });
        if (r.status === 401) {
          // 沒登入 → 去登入，帶回跳參數
          window.location.href = "/login?next=/profile";
          return;
        }
        if (!r.ok) throw new Error("FETCH_ME_FAIL");
        const data = await r.json();
        if (alive) setMe(data.user as Me);
      } catch {
        // 發生錯誤也導回登入（保守處理）
        window.location.href = "/login?next=/profile";
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <main style={{minHeight:'100svh',display:'grid',placeItems:'center',color:'#b9c7d6'}}>
        載入中…
      </main>
    );
  }

  if (!me) return null;

  return (
    <main style={{ minHeight: "100svh", padding: 24, background: "radial-gradient(1000px 600px at 10% -10%, rgba(90,200,250,.12), transparent 50%), radial-gradient(900px 700px at 110% 0%, rgba(167,139,250,.12), transparent 60%), #0b0f1a", color: "#dfe6ff" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>TOPZCASINO</div>
          <nav style={{ display: "flex", gap: 12 }}>
            <Link href="/" style={{ color: "#b9c7d6", textDecoration: "none" }}>回大廳</Link>
            <Link href="/logout" onClick={async (e)=>{ e.preventDefault(); await fetch("/api/auth/logout",{method:"POST"}); window.location.href="/login";}} style={{ color: "#b9c7d6", textDecoration: "none" }}>
              登出
            </Link>
          </nav>
        </header>

        <section style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          gap: 18,
          borderRadius: 16,
          padding: 18,
          background: "rgba(20,24,36,.46)",
          border: "1px solid rgba(255,255,255,.12)",
          boxShadow: "0 10px 30px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08), 0 0 60px rgba(167,139,250,.14)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}>
          {/* Avatar */}
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ position: "relative", width: 180, height: 180, borderRadius: "50%", overflow: "hidden", border: "1px solid rgba(255,255,255,.14)" }}>
              {/* 外圍霓虹頭框效果（純視覺） */}
              <div style={{
                position: "absolute", inset: -10, borderRadius: "50%",
                background: "conic-gradient(from 0deg, rgba(90,200,250,.5), rgba(167,139,250,.6), rgba(52,211,153,.5), rgba(90,200,250,.5))",
                filter: "blur(10px)", opacity: .7
              }} />
              <img
                src={me.avatarUrl || "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=guest"}
                alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", position: "relative" }}
              />
            </div>
            <div style={{ fontSize: 14, color: "#8ea0bf" }}>
              頭框：{me.headframe ?? "NONE"}<br/>
              面板：{me.panelStyle ?? "DEFAULT"} {me.panelTint ? `(${me.panelTint})` : ""}
            </div>
          </div>

          {/* Info */}
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: ".03em" }}>
              {me.displayName} <span style={{ fontSize: 14, color: "#8ea0bf", fontWeight: 500 }}>VIP {me.vipTier}</span>
            </div>
            <div style={{ color: "#8ea0bf" }}>{me.email}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
              <div style={{ border: "1px solid rgba(255,255,255,.14)", borderRadius: 12, padding: 12, background: "linear-gradient(180deg, rgba(255,255,255,.04), transparent)" }}>
                <div style={{ color: "#8ea0bf", fontSize: 12 }}>錢包餘額</div>
                <b style={{ letterSpacing: ".04em" }}>{me.balance.toLocaleString()}</b>
              </div>
              <div style={{ border: "1px solid rgba(255,255,255,.14)", borderRadius: 12, padding: 12, background: "linear-gradient(180deg, rgba(255,255,255,.04), transparent)" }}>
                <div style={{ color: "#8ea0bf", fontSize: 12 }}>銀行餘額</div>
                <b style={{ letterSpacing: ".04em" }}>{me.bankBalance.toLocaleString()}</b>
              </div>
            </div>
            <div style={{ marginTop: 6 }}>
              <div style={{ color: "#8ea0bf", fontSize: 12, marginBottom: 6 }}>個人介紹</div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {me.about || "—"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Link href="/" style={{ textDecoration: "none", color: "#dfe6ff", border: "1px solid rgba(255,255,255,.14)", borderRadius: 10, padding: "10px 12px", background: "linear-gradient(180deg, rgba(255,255,255,.06), transparent)" }}>
                返回大廳
              </Link>
              <Link href="/wallet" style={{ textDecoration: "none", color: "#dfe6ff", border: "1px solid rgba(255,255,255,.14)", borderRadius: 10, padding: "10px 12px", background: "linear-gradient(180deg, rgba(255,255,255,.06), transparent)" }}>
                前往錢包
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
