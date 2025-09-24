"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** 進大廳是否自動開啟（每次都會顯示） */
  autoOpen?: boolean;
  /** 預設標題/內容（若未連接後端，可先用這些） */
  defaultTitle?: string;
  defaultContent?: string;
  /** 點背景是否可關閉（預設 true） */
  closeOnBackdrop?: boolean;
};

export default function LobbyPopupModal({
  autoOpen = true,
  defaultTitle = "⚡ 最新公告",
  defaultContent = "🎉 歡迎來到 TOPZ CASINO！每日簽到可領取獎勵 🎁",
  closeOnBackdrop = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // 進大廳自動開啟
  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  // 開啟時：鎖定背景卷軸、Esc 關閉、聚焦到關閉鍵
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

  if (!open) return null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className="popup-overlay"
      role="presentation"
      onClick={() => closeOnBackdrop && setOpen(false)}
    >
      <div
        className="popup-modal"
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
