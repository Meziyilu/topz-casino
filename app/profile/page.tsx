"use client";

import { useEffect, useMemo, useState } from "react";
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
  headframe?: string | null;   // 後端是 enum，這裡先用字串承接
  panelStyle?: string | null;  // 若 schema 是 enum，後端會驗證；這裡照字串送
  panelTint?: string | null;   // HEX 或 key
};

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState<Partial<Me>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/profile/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setMe(d.user);
        setForm({
          displayName: d.user.displayName,
          nickname: d.user.nickname ?? "",
          about: d.user.about ?? "",
          country: d.user.country ?? "",
          avatarUrl: d.user.avatarUrl ?? "",
          headframe: d.user.headframe ?? "",
          panelStyle: d.user.panelStyle ?? "",
          panelTint: d.user.panelTint ?? "#00d1ff",
        });
      })
      .catch(() => setToast({ type: "err", text: "讀取個人資料失敗" }))
      .finally(() => setLoading(false));
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(s => ({ ...s, [name]: value }));
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setToast(null);

    const payload: Record<string, any> = {};
    for (const k of ["displayName","nickname","about","country","avatarUrl","headframe","panelStyle","panelTint"] as const) {
      if (form[k] !== undefined) payload[k] = form[k];
    }

    const res = await fetch("/api/profile/me", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setSaving(false);
      setToast({ type: "err", text: "儲存失敗" });
      return;
    }

    const d = await res.json();
    setMe(d.user);
    setSaving(false);
    setToast({ type: "ok", text: "已更新 ✅" });
    setTimeout(() => setToast(null), 1600);
  };

  const vipLabel = useMemo(() => `VIP ${me?.vipTier ?? 0}`, [me]);

  return (
    <main className="pf-wrap">
      {/* 背景 & 粒子 */}
      <div className="pf-bg"/>
      <div className="pf-particles" aria-hidden/>

      <link rel="stylesheet" href="/styles/profile.css" />

      {/* 頂部導覽 */}
      <header className="pf-header">
        <div className="left">
          <Link href="/" className="pf-logo">TOPZCASINO</Link>
          <span className="pf-sub">PROFILE</span>
        </div>
        <nav className="right">
          <Link className="pf-nav" href="/">大廳</Link>
          <Link className="pf-nav" href="/wallet">錢包</Link>
          <Link className="pf-nav" href="/shop">商店</Link>
        </nav>
      </header>

      {/* HERO 卡（頭像／VIP／餘額） */}
      <section className="pf-hero pf-tilt">
        <div className="pf-avatar">
          <div className="pf-ava-core">
            {form.avatarUrl
              ? <img src={form.avatarUrl} alt="avatar" />
              : <div className="pf-ava-fallback">👤</div>}
          </div>
          <div className="pf-ava-frame"/>
          <div className="pf-ava-glow"/>
        </div>

        <div className="pf-hero-text">
          <h1 className="pf-name">{me?.displayName ?? "玩家"}</h1>
          <div className="pf-vip">{vipLabel}</div>
          <div className="pf-balances">
            <div className="pf-bal">
              <span>錢包</span>
              <b>{(me?.balance ?? 0).toLocaleString()}</b>
            </div>
            <div className="pf-bal">
              <span>銀行</span>
              <b>{(me?.bankBalance ?? 0).toLocaleString()}</b>
            </div>
          </div>
        </div>

        {/* hero 右上角流光 */}
        <div className="pf-hero-sheen" />
      </section>

      {/* 主卡：編輯表單 */}
      <section className="pf-card pf-tilt">
        <form className="pf-grid" onSubmit={onSave}>
          <div className="pf-field">
            <input name="displayName" value={form.displayName ?? ""} onChange={onChange} placeholder=" " required minLength={2} maxLength={20}/>
            <label>玩家暱稱</label>
          </div>

          <div className="pf-field">
            <input name="nickname" value={form.nickname ?? ""} onChange={onChange} placeholder=" " maxLength={30}/>
            <label>暱稱（公開）</label>
          </div>

          <div className="pf-field wide">
            <textarea name="about" value={form.about ?? ""} onChange={onChange} placeholder=" " rows={3} maxLength={200}/>
            <label>自我介紹</label>
          </div>

          <div className="pf-field">
            <input name="country" value={form.country ?? ""} onChange={onChange} placeholder=" " maxLength={2}/>
            <label>國家（ISO-2）</label>
          </div>

          <div className="pf-field">
            <input name="avatarUrl" value={form.avatarUrl ?? ""} onChange={onChange} placeholder=" " />
            <label>頭像 URL</label>
          </div>

          <div className="pf-field">
            <input name="panelTint" value={form.panelTint ?? ""} onChange={onChange} placeholder=" " />
            <label>面板色（HEX）</label>
          </div>

          <div className="pf-field">
            <input name="headframe" value={form.headframe ?? ""} onChange={onChange} placeholder=" " />
            <label>頭框代碼（可選）</label>
          </div>

          <div className="pf-field">
            <input name="panelStyle" value={form.panelStyle ?? ""} onChange={onChange} placeholder=" " />
            <label>面板樣式（可選）</label>
          </div>

          <div className="pf-actions">
            <button className="pf-btn" disabled={saving || loading}>
              {saving ? "儲存中…" : "儲存變更"}
            </button>
            <Link className="pf-btn ghost" href="/">回大廳</Link>
          </div>
        </form>

        {/* 卡片邊緣霓虹 */}
        <div className="pf-ring pf-ring-1"/>
        <div className="pf-ring pf-ring-2"/>
      </section>

      {/* Toast */}
      {toast && (
        <div className={`pf-toast ${toast.type === "ok" ? "ok" : "err"}`}>
          {toast.text}
        </div>
      )}
    </main>
  );
}
