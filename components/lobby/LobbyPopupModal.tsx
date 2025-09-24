"use client";

import { useEffect, useRef, useState, useMemo } from "react";

type Variant = "glass" | "neon" | "aurora";
type Animation = "fade" | "zoom" | "slide-up";

export type Props = {
  /** 進大廳是否自動開啟（每次都會顯示） */
  autoOpen?: boolean;

  /**（可選）預設標題/內容：若未接後端，可用這兩個 prop 顯示內容 */
  defaultTitle?: string;
  defaultContent?: string;

  /** 點背景是否可關閉（預設 true） */
  closeOnBackdrop?: boolean;

  /** 下列為相容/風格用 props（可傳可不傳） */
  storageKeyPrefix?: string | undefined | null;     // 目前不做儲存，保留相容
  remindAfterMinutes?: number | null;               // 目前不使用，保留相容
  useExternalStyle?: boolean;                       // 若你載了 /public/styles/popup.css，設為 true
  variant?: Variant;                                // "glass" | "neon" | "aurora"
  animation?: Animation;                            // "fade" | "zoom" | "slide-up"
  className?: string;                               // 客製 className
};

export default function LobbyPopupModal({
  autoOpen = true,
  defaultTitle = "⚡ 最新公告",
  defaultContent = "🎉 歡迎來到 TOPZ CASINO！每日簽到可領取獎勵 🎁",
  closeOnBackdrop = true,

  // 相容/風格 props（可忽略）
  storageKeyPrefix,
  remindAfterMinutes,
  useExternalStyle = true,
  variant = "glass",
  animation = "slide-up",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // 進大廳立即開啟（你現在要“每次都顯示”，所以不使用任何 localStorage）
  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  // 開啟時：鎖背景卷軸 + Esc 關閉 + 聚焦關閉鍵
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.classList.add("no-scroll");
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    // 聚焦
    setTimeout(() => closeBtnRef.current?.focus(), 0);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // 風格 className（若未使用外部樣式，仍給最基本樣式避免空白）
  const classes = useMemo(() => {
    const baseOverlay = "popup-overlay";
    const baseModal = ["popup-modal"];

    // 變體樣式（你可在 popup.css 裡擴充 .popup--neon/.popup--aurora）
    if (variant) baseModal.push(`popup--${variant}`);

    // 動畫樣式（同上，可在 CSS 擴充 .popup-anim-*）
    if (animation) baseModal.push(`popup-anim-${animation}`);

    if (className) baseModal.push(className);

    return { overlay: baseOverlay, modal: baseModal.join(" ") };
  }, [variant, animation, className]);

  if (!open) return null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  // 如果不想用外部 CSS，也提供基本內嵌樣式（最小保護，避免完全沒樣式）
  const InlineFallback = () =>
    useExternalStyle ? null : (
      <style>{`
        .popup-overlay { position: fixed; inset: 0; display:flex;align-items:center;justify-content:center; background:rgba(6,10,18,.65); z-index:9999; }
        .popup-modal { background: rgba(18,22,33,.9); color:#eef3ff; border-radius:14px; border:1px solid rgba(255,255,255,.08); width:min(420px,92vw); box-shadow:0 18px 48px rgba(0,0,0,.45); }
        .popup-body { padding:18px; max-height:calc(100vh - 160px); overflow:auto; }
        .popup-title { margin:0 0 10px; font-size:20px; font-weight:800; }
        .popup-content { margin:0; color:#cfd4e0; line-height:1.6; }
        .popup-actions { display:flex; gap:10px; justify-content:flex-end; padding:0 18px 16px; }
        .popup-btn { padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.12); background:linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.06)); color:#f6fbff; font-weight:800; cursor:pointer; }
        .popup-btn--primary { background: linear-gradient(180deg, #4cc4ff, #2f9de0); border-color: rgba(0,0,0,.15); }
        .popup-close { position:absolute; top:10px; right:10px; width:36px; height:36px; border-radius:10px; border:1px solid rgba(255,255,255,.12); background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04)); color:#e8efff; display:grid;place-items:center; }
      `}</style>
    );

  return (
    <div
      className={classes.overlay}
      role="presentation"
      onClick={() => closeOnBackdrop && setOpen(false)}
    >
      <InlineFallback />
      <div
        className={classes.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lobby-popup-title"
        aria-describedby="lobby-popup-content"
        onClick={stop}
      >
        <button
          className="popup-close"
          aria-label="關閉彈窗"
          onClick={() => setOpen(false)}
          ref={closeBtnRef}
        >
          ×
        </button>

        <div className="popup-body">
          <h2 id="lobby-popup-title" className="popup-title">
            {defaultTitle}
          </h2>
          <p id="lobby-popup-content" className="popup-content">
            {defaultContent}
          </p>
        </div>

        <div className="popup-actions">
          <button className="popup-btn" onClick={() => setOpen(false)}>
            稍後再看
          </button>
          <button className="popup-btn popup-btn--primary" onClick={() => setOpen(false)}>
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
