// components/lobby/LobbyPopupModal.tsx
"use client";

import { useEffect, useState } from "react";

type LatestAnn = {
  title: string;
  body: string;
};

type Props = {
  autoOpen?: boolean;         // 進頁面就打開（預設 true）
  variant?: "glass" | "neon" | "aurora";
  animation?: "fade" | "zoom" | "slide-up";
  className?: string;
  // 如果後端暫時沒有資料，可用 fallback 顯示
  fallback?: LatestAnn | null;
};

export default function LobbyPopupModal({
  autoOpen = true,
  variant = "glass",
  animation = "slide-up",
  className,
  fallback = null,
}: Props) {
  const [open, setOpen] = useState(false);
  const [latest, setLatest] = useState<LatestAnn | null>(fallback);

  // 每次掛載都抓最新公告
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/announcements/latest", { cache: "no-store" });
        if (!r.ok) throw new Error("bad");
        const d = await r.json();
        // 後端格式預期：{ item: { title, body, ... } } 或 { title, body }
        const item = d?.item ?? d ?? null;
        if (alive) setLatest(item ? { title: item.title ?? "", body: item.body ?? "" } : null);
      } catch {
        // 保持 fallback（如果有）
      } finally {
        // 不論有沒有抓到，都照設定直接打開
        if (alive && autoOpen) setOpen(true);
      }
    })();
    return () => { alive = false; };
  }, [autoOpen]);

  // 防止背景滾動（僅在開啟期間）
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div className={`popup-overlay ${className ?? ""}`} role="dialog" aria-modal="true">
      <div className={`popup ${variant} ${animation}`}>
        <header className="popup__head">
          <h3 className="popup__title">{latest?.title ?? "最新公告"}</h3>
          <button className="popup__close" onClick={() => setOpen(false)} aria-label="關閉">×</button>
        </header>

        <section className="popup__body">
          <div className="popup__content">
            {latest?.body ? (
              <p style={{ whiteSpace: "pre-wrap" }}>{latest.body}</p>
            ) : (
              <p>歡迎來到 TOPZ CASINO！祝你遊玩愉快 🎉</p>
            )}
          </div>
        </section>

        <footer className="popup__foot">
          <button className="popup__btn" onClick={() => setOpen(false)}>知道了</button>
        </footer>
      </div>

      <style jsx>{`
        .popup-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.55);
          display: grid; place-items: center;
          z-index: 1100;
          padding: clamp(12px, 4vw, 24px);
        }
        .popup {
          width: min(680px, 92vw);
          border-radius: 14px;
          overflow: hidden;
          color: #eaf2ff;
          box-shadow: 0 18px 48px rgba(0,0,0,.35);
        }
        .popup.glass {
          background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.04));
          border: 1px solid rgba(255,255,255,.16);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .popup.neon { background: #0a0f1a; border: 1px solid rgba(80,240,255,.22); box-shadow: 0 0 24px rgba(0,255,240,.08); }
        .popup.aurora { background: radial-gradient(1200px 600px at -10% -10%, rgba(0,248,255,.08), transparent),
                                  radial-gradient(800px 400px at 120% 120%, rgba(255,0,248,.08), transparent),
                                  rgba(7,11,20,.86);
                         border: 1px solid rgba(255,255,255,.12);
                       }

        .popup__head { display:flex; align-items:center; justify-content:space-between; padding:16px 18px; }
        .popup__title { font-size: clamp(18px, 2.4vw, 22px); font-weight: 800; letter-spacing:.02em; }
        .popup__close { background:none; border:0; font-size: 22px; color:#cdd6f4; cursor:pointer; line-height:1; }

        .popup__body { padding: 12px 18px 4px; }
        .popup__content { font-size: 15px; line-height: 1.7; color:#dfe8ff; }

        .popup__foot { padding: 16px 18px 20px; display:flex; justify-content:flex-end; }
        .popup__btn {
          background: linear-gradient(180deg, #5b96ff, #3b82f6);
          border: 0; border-radius: 10px; padding: 10px 14px;
          font-weight: 800; letter-spacing: .02em; color: #fff; cursor: pointer;
        }

        /* 動畫 */
        .popup.fade   { animation: pop-fade .18s ease-out; }
        .popup.zoom   { animation: pop-zoom .18s ease-out; transform-origin: 50% 50%; }
        .popup.slide-up { animation: pop-slide-up .22s ease-out; }

        @keyframes pop-fade { from {opacity:0} to {opacity:1} }
        @keyframes pop-zoom { from {opacity:0; transform:scale(.95)} to {opacity:1; transform:scale(1)} }
        @keyframes pop-slide-up { from {opacity:0; transform: translateY(10px)} to {opacity:1; transform: translateY(0)} }

        /* 手機優化 */
        @media (max-width: 480px) {
          .popup { width: 94vw; }
          .popup__content { font-size: 14px; }
        }
      `}</style>
    </div>
  );
}
