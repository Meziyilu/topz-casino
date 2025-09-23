// components/lobby/LobbyPopupModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Popup = { id: string; title: string; body: string };

type Variant = "glass" | "neon" | "aurora";
type Animation = "fade" | "zoom" | "slide-up";

export default function LobbyPopupModal({
  autoOpen = true,
  storageKeyPrefix = "topz",
  remindAfterMinutes = null,
  debug = false,

  // ✅ 新增：樣式選項
  useExternalStyle = false,
  variant = "glass",
  animation = "fade",
  className = "",
}: {
  autoOpen?: boolean;
  storageKeyPrefix?: string;
  remindAfterMinutes?: number | null;
  debug?: boolean;

  useExternalStyle?: boolean;
  variant?: Variant;
  animation?: Animation;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<Popup | null>(null);
  const store = useMemo(() => window.localStorage, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/lobby-popups/active?t=${Date.now()}`, { cache: "no-store" });
        const d = await r.json();
        const latest: Popup | null = d.item ?? null;
        if (!alive) return;
        setItem(latest);

        if (debug) console.log("[Popup] latest", latest);
        if (latest && autoOpen) {
          const key = `${storageKeyPrefix}_popup_dismissed_${latest.id}`;
          const dismissed = store.getItem(key);
          if (!dismissed) {
            setOpen(true);
          } else if (remindAfterMinutes) {
            const ts = Number(dismissed);
            if (!Number.isNaN(ts) && Date.now() - ts >= remindAfterMinutes * 60 * 1000) {
              setOpen(true);
            }
          }
        }
      } catch (e) {
        if (debug) console.warn("[Popup] error", e);
      }
    };
    load();
    return () => { alive = false; };
  }, [autoOpen, storageKeyPrefix, remindAfterMinutes, store, debug]);

  const close = () => {
    if (item) {
      const key = `${storageKeyPrefix}_popup_dismissed_${item.id}`;
      store.setItem(key, remindAfterMinutes ? String(Date.now()) : "1");
      // 可選：已讀回報
      // void fetch("/api/lobby-popups/ack", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ popupId: item.id }) });
    }
    setOpen(false);
  };

  if (!open || !item) return null;

  const external = (
    <div className={`popup-overlay ${className}`} onClick={close}>
      <div className={`popup popup--${variant} pop-${animation}`} onClick={(e) => e.stopPropagation()}>
        <div className="popup__head">
          <h3 className="popup__title">{item.title}</h3>
          <button className="popup__close" onClick={close} aria-label="關閉">✕</button>
        </div>
        <div className="popup__body">
          <div className="popup__content" style={{ whiteSpace: "pre-wrap" }}>{item.body}</div>
        </div>
        <div className="popup__actions">
          <button className="lb-btn" onClick={close}>知道了</button>
        </div>
      </div>
    </div>
  );

  if (useExternalStyle) return external;

  // 內建（舊）樣式（如你想完全靠 styled-jsx）
  return (
    <div className="ann-modal-overlay" onClick={close}>
      <div className="ann-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ann-head">
          <h3>{item.title}</h3>
          <button className="ann-close" onClick={close}>✕</button>
        </div>
        <div className="ann-body"><div style={{ whiteSpace: "pre-wrap" }}>{item.body}</div></div>
        <div className="ann-actions"><button className="lb-btn" onClick={close}>知道了</button></div>
      </div>
      <style jsx>{`
        .ann-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px; }
        .ann-modal { width: min(680px, 96vw); background: rgba(17,24,39,.9); color:#e5e7eb; border:1px solid rgba(255,255,255,.12); backdrop-filter: blur(14px); border-radius:14px; box-shadow:0 18px 48px rgba(0,0,0,.5); overflow:hidden; }
        .ann-head { display:flex; align-items:center; justify-content:space-between; padding:16px 16px 8px; }
        .ann-head h3 { margin:0; font-size:18px; font-weight:800; }
        .ann-close { background:transparent; color:#a3a3a3; border:none; font-size:18px; cursor:pointer; }
        .ann-body { padding:0 16px 10px; font-size:15px; line-height:1.6; }
        .ann-actions { padding:12px 16px 16px; display:flex; justify-content:flex-end; gap:10px; }
      `}</style>
    </div>
  );
}
