// app/profile/page.tsx
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
  headframe?: string | null;  // 前端以字串呈現，後端驗證/正規化
  panelStyle?: string | null;
  panelTint?: string | null;
};

// 只能讀取 NEXT_PUBLIC_* 變數（在 client）——你已經有設定這兩個
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState<Partial<Me>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 讀取個人資料
  useEffect(() => {
    fetch("/api/profile/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
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

  // 表單控制
  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  // 上傳頭像（前端直傳 Cloudinary，無需經過自家後端）
  const onPickAvatar = async (f?: File | null) => {
    if (!f) return;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setToast({ type: "err", text: "未設定 Cloudinary 環境變數" });
      setTimeout(() => setToast(null), 1500);
      return;
    }

    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("upload_preset", UPLOAD_PRESET);
      // 如需固定資料夾，可開啟下一行：
      // fd.append("folder", "avatars");

      // 不要手動設定 Content-Type，由瀏覽器自動帶 multipart/form-data
      const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: fd,
      });

      const json = await r.json();
      if (!r.ok || !json.secure_url) {
        throw new Error(json?.error?.message || "UPLOAD_FAILED");
      }

      // 成功後先寫到表單；按「儲存變更」才寫回 DB
      setForm((s) => ({ ...s, avatarUrl: json.secure_url as string }));
      setToast({ type: "ok", text: "頭像已上傳 ✅" });
    } catch (err: any) {
      setToast({ type: "err", text: `上傳失敗：${err?.message || "未知錯誤"}` });
    } finally {
      setTimeout(() => setToast(null), 1500);
    }
  };

  // 儲存（空字串→省略，只送允許欄位）
  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setToast(null);

    const ALLOWED: (keyof Me)[] = [
      "displayName",
      "nickname",
      "about",
      "country",
      "avatarUrl",
      "headframe",
      "panelStyle",
      "panelTint",
    ];

    const normalize = (v: unknown) => {
      if (typeof v === "string") {
        const s = v.trim();
        return s.length ? s : undefined;
      }
      return v ?? undefined;
    };

    const payload: Record<string, unknown> = {};
    for (const k of ALLOWED) {
      if (form[k] !== undefined) {
        const v = normalize(form[k] as any);
        if (v !== undefined) payload[k] = v;
      }
    }

    try {
      const res = await fetch("/api/profile/me", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        window.location.href = "/login?next=/profile";
        return;
      }

      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast({ type: "err", text: d?.error ?? "儲存失敗" });
        return;
      }

      if (d?.user) setMe(d.user);
      setToast({ type: "ok", text: "已更新 ✅" });
    } catch {
      setToast({ type: "err", text: "儲存失敗（網路錯誤）" });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 1600);
    }
  };

  const vipLabel = useMemo(() => `VIP ${me?.vipTier ?? 0}`, [me]);

  return (
    <main className="pf-wrap">
      {/* 背景與粒子 */}
      <div className="pf-bg" />
      <div className="pf-particles" aria-hidden />

      {/* ✅ 套用兩個 CSS：玻璃感 + 頭框效果 */}
      <link rel="stylesheet" href="/styles/profile.css" />
      <link rel="stylesheet" href="/styles/headframes.css" />

      {/* Header */}
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
        <div className="pf-hero-left">
          <div
            className={`pf-avatar ${form.headframe ? `hf-${String(form.headframe).toLowerCase()}` : "hf-none"}`}
            style={form.panelTint ? ({ ["--pf-tint" as any]: form.panelTint } as React.CSSProperties) : undefined}
          >
            <div className="pf-ava-core">
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="avatar" />
              ) : (
                <div className="pf-ava-fallback">👤</div>
              )}
            </div>
            {/* 外圈特效（不覆蓋頭像） */}
            <div className="pf-ava-frame" />
            <div className="pf-ava-glow" />

            {/* 上傳按鈕（覆蓋在頭像右下角） */}
            <label className="pf-file-btn">
              上傳頭像
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => onPickAvatar(e.currentTarget.files?.[0])}
              />
            </label>
          </div>
        </div>

        <div className="pf-hero-right">
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

        {/* 右上角掃光 */}
        <div className="pf-hero-sheen" />
      </section>

      {/* 編輯卡（網格留白，避免擁擠） */}
      <section className="pf-card pf-tilt">
        <form className="pf-grid" onSubmit={onSave}>
          <div className="pf-field">
            <input
              name="displayName"
              value={form.displayName ?? ""}
              onChange={onChange}
              placeholder=" "
              required
              minLength={2}
              maxLength={20}
            />
            <label>玩家暱稱</label>
          </div>

          <div className="pf-field">
            <input name="nickname" value={form.nickname ?? ""} onChange={onChange} placeholder=" " maxLength={30} />
            <label>暱稱（公開）</label>
          </div>

          <div className="pf-field wide">
            <textarea
              name="about"
              value={form.about ?? ""}
              onChange={onChange}
              placeholder=" "
              rows={4}
              maxLength={200}
            />
            <label>自我介紹</label>
          </div>

          <div className="pf-field">
            <input name="country" value={form.country ?? ""} onChange={onChange} placeholder=" " maxLength={2} />
            <label>國家（ISO-2）</label>
          </div>

          <div className="pf-field">
            <input name="avatarUrl" value={form.avatarUrl ?? ""} onChange={onChange} placeholder=" " />
            <label>頭像 URL（可選）</label>
          </div>

          <div className="pf-field">
            <input name="panelTint" value={form.panelTint ?? ""} onChange={onChange} placeholder=" " />
            <label>面板色（HEX 或預設 key）</label>
          </div>

          <div className="pf-field">
            <input name="headframe" value={form.headframe ?? ""} onChange={onChange} placeholder=" " />
            <label>頭框代碼（可選）</label>
            <small className="pf-help">示例：gold / cyan / neon / royal …（先用字串；之後可串 enum）</small>
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
        <div className="pf-ring pf-ring-1" />
        <div className="pf-ring pf-ring-2" />
      </section>

      {/* Toast */}
      {toast && <div className={`pf-toast ${toast.type === "ok" ? "ok" : "err"}`}>{toast.text}</div>}
    </main>
  );
}
