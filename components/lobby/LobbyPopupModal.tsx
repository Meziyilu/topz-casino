"use client";

import { useEffect, useMemo, useState } from "react";

type Variant = "glass" | "neon" | "aurora";
type Animation = "fade" | "zoom" | "slide-up";

export type Props = {
  /** 預設掛載後是否自動開啟 */
  autoOpen?: boolean;
  /** 樣式外觀（配合 /public/styles/popup.css） */
  variant?: Variant;
  /** 進場動畫 */
  animation?: Animation;
  /** 額外 class（例如置中） */
  className?: string;
  /** true：使用你專案的 /public/styles/popup.css；false：使用元件內建極簡樣式 */
  useExternalStyle?: boolean;
  /**
   * 幾分鐘內不再提醒；null 表示【每次都跳】
   * 例如 60 → 一小時內不再提醒
   */
  remindAfterMinutes?: number | null;
  /** localStorage key 前綴；不同站可區分 */
  storageKeyPrefix?: string;
};

type PopupData = {
  title: string;
  body: string;
};

const FETCH_URL = "/api/announcements/latest"; // 這支會回傳當前要顯示的公告（title/body）

export default function LobbyPopupModal({
  autoOpen = false,
  variant = "glass",
  animation = "fade",
  className,
  useExternalStyle = true,
  remindAfterMinutes = 60, // 預設 60 分鐘內不再提醒
  storageKeyPrefix = "popup",
}: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PopupData | null>(null);
  const [loading, setLoading] = useState(false);

  const lastSeenKey = useMemo(() => `${storageKeyPrefix}:lobby_popup:last_seen`, [storageKeyPrefix]);

  /** 取得彈窗內容 */
  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(FETCH_URL, { cache: "no-store" });
      if (r.ok) {
        // 兼容兩種可能結構：{ item: {title,body} } 或 { title, body }
        const json = await r.json();
        const item = json?.item ?? json ?? null;
        if (item?.title && item?.body) {
          setData({ title: item.title, body: item.body });
        } else {
          setData(null);
        }
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  /** 判斷是否應該顯示 */
  const shouldOpen = (): boolean => {
    if (remindAfterMinutes === null) return true; // 每次都跳
    try {
      const raw = localStorage.getItem(lastSeenKey);
      if (!raw) return true;
      const last = Number(raw);
      if (!Number.isFinite(last)) return true;
      const gapMs = Date.now() - last;
      return gapMs > remindAfterMinutes * 60_000;
    } catch {
      return true;
    }
  };

  /** 記錄關閉時間 */
  const stampClose = () => {
    try {
      localStorage.setItem(lastSeenKey, String(Date.now()));
    } catch {}
  };

  /** 掛載後自動開啟 */
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!autoOpen) return;
      const wantOpen = shouldOpen();
      if (!wantOpen) return;
      await load();
      if (!cancelled) setOpen(true);
    };
    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, lastSeenKey, remindAfterMinutes]);

  const close = () => {
    setOpen(false);
    stampClose();
  };

  if (!open) return null;

  const wrapperCls = [
    "lp-overlay",
    `lp-anim-${animation}`,
    useExternalStyle ? "" : "lp-inline-style",
  ]
    .filter(Boolean)
    .join(" ");

  const modalCls = ["lp-modal", `lp-variant-${variant}`, className].filter(Boolean).join(" ");

  return (
    <>
      {/* 內建極簡樣式（當 useExternalStyle=false 時才注入） */}
      {!useExternalStyle && (
        <style jsx>{`
          .lp-overlay {
            position: fixed; inset: 0; z-index: 60;
            display: grid; place-items: center;
            background: rgba(0,0,0,.55);
          }
          .lp-modal {
            width: min(560px, 92vw);
            max-height: 80vh;
            overflow: auto;
            border-radius: 16px;
            padding: 18px 20px;
            background: #12131a;
            color: #eaf2ff;
            box-shadow: 0 20px 42px rgba(0,0,0,.45);
          }
          .lp-modal h3 {
            margin: 0 0 8px; font-size: 18px; font-weight: 800;
          }
          .lp-modal .lp-body { white-space: pre-wrap; line-height: 1.6; }
          .lp-actions { display:flex; justify-content:flex-end; gap:10px; margin-top: 14px; }
          .lp-btn {
            padding: 8px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,.15);
            background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
            color: #eaf2ff; font-weight: 700;
          }

          /* 動畫 */
          .lp-anim-fade { animation: lpFade .18s ease-out; }
          @keyframes lpFade { from { opacity: 0 } to { opacity: 1 } }
          .lp-anim-zoom { animation: lpZoom .22s cubic-bezier(.2,.8,.2,1) }
          @keyframes lpZoom { from { opacity:0; transform: scale(.92) } to { opacity:1; transform: scale(1) } }
          .lp-anim-slide-up { animation: lpSlideUp .22s cubic-bezier(.2,.8,.2,1) }
          @keyframes lpSlideUp { from { opacity:0; transform: translateY(10px) } to { opacity:1; transform: translateY(0) } }

          /* 內建三種外觀的最小差異（若使用外部樣式會被覆蓋） */
          .lp-variant-glass { backdrop-filter: blur(14px); background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.06)); border: 1px solid rgba(255,255,255,.16); }
          .lp-variant-neon { box-shadow: 0 0 18px rgba(99,102,241,.55), inset 0 0 1px rgba(255,255,255,.2); border: 1px solid rgba(99,102,241,.4); }
          .lp-variant-aurora { background: radial-gradient(120% 120% at 0% 0%, rgba(56,189,248,.25), transparent 40%), radial-gradient(120% 120% at 100% 0%, rgba(99,102,241,.22), transparent 40%), radial-gradient(120% 120% at 100% 100%, rgba(244,63,94,.18), transparent 40%), #0b0d12; }
        `}</style>
      )}

      <div className={wrapperCls} role="dialog" aria-modal="true">
        <div className={modalCls}>
          {loading ? (
            <div className="lp-body">載入中…</div>
          ) : data ? (
            <>
              <h3>{data.title}</h3>
              <div className="lp-body">{data.body}</div>
            </>
          ) : (
            <>
              <h3>最新公告</h3>
              <div className="lp-body">目前沒有需要顯示的彈窗內容。</div>
            </>
          )}

          <div className="lp-actions">
            <button className="lp-btn" onClick={close}>知道了</button>
          </div>
        </div>
      </div>
    </>
  );
}
