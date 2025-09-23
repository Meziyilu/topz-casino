"use client";

import { useEffect, useMemo, useState } from "react";

type PopupItem = {
  id: string;
  title: string;
  body: string;
};

type Props = {
  autoOpen?: boolean;
  storageKeyPrefix?: string;        // e.g. "topz"
  remindAfterMinutes?: number | null; // null = 本次關閉後，本次 session 不再出；數值=多久後可再出
  useExternalStyle?: boolean;       // 你已經有 /styles/popup.css
  variant?: "glass" | "neon" | "aurora";
  animation?: "fade" | "zoom" | "slide-up";
  className?: string;               // 位置等客製
};

export default function LobbyPopupModal({
  autoOpen = true,
  storageKeyPrefix = "topz",
  remindAfterMinutes = null,
  useExternalStyle = true,
  variant = "glass",
  animation = "slide-up",
  className = "popup--center",
}: Props) {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<PopupItem | null>(null);

  // local/session key
  const storeKey = useMemo(
    () => `${storageKeyPrefix}:popup:last-closed`,
    [storageKeyPrefix]
  );
  const seenKey = useMemo(
    () => `${storageKeyPrefix}:popup:seen-id`,
    [storageKeyPrefix]
  );

  // 讀最新公告（用現有 /api/announcements/latest）
  useEffect(() => {
    let abort = false;

    async function run() {
      try {
        const r = await fetch("/api/announcements/latest", { cache: "no-store" });
        if (!r.ok) throw new Error("http");
        const data = await r.json();
        const latest = data?.item as PopupItem | null;
        if (!latest || abort) return;

        setItem({ id: latest.id, title: latest.title, body: latest.body });

        if (!autoOpen) return;

        // 關閉節流：同一公告 id 已看過？
        const seenId = window.localStorage.getItem(seenKey);
        if (seenId && seenId === latest.id) {
          // 如果有 remindAfterMinutes，就看是否到期；否則本次 session 不再打開
          if (remindAfterMinutes && remindAfterMinutes > 0) {
            const last = window.localStorage.getItem(storeKey);
            if (last) {
              const lastTs = Number(last);
              const now = Date.now();
              const gap = remindAfterMinutes * 60 * 1000;
              if (now - lastTs < gap) return; // 未到期，不開
            }
          } else {
            return;
          }
        }

        setOpen(true);
      } catch {
        // 忽略錯誤
      }
    }
    run();

    return () => {
      abort = true;
    };
  }, [autoOpen, remindAfterMinutes, seenKey, storeKey]);

  function close() {
    setOpen(false);
    if (item) {
      try {
        window.localStorage.setItem(seenKey, item.id);
        window.localStorage.setItem(storeKey, String(Date.now()));
      } catch {}
    }
  }

  if (!item) return null;

  return (
    <>
      {!useExternalStyle && (
        <style>{popupCss}</style>
      )}

      <div className={`popup-mask ${open ? "is-open" : ""}`} onClick={close} />

      <div
        className={[
          "popup",
          `popup--${variant}`,
          `popup-anim--${animation}`,
          open ? "is-open" : "",
          className ?? "",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-title"
      >
        <button className="popup__close" aria-label="關閉" onClick={close}>×</button>

        <div className="popup__body">
          <h3 id="popup-title" className="popup__title">{item.title}</h3>
          <div className="popup__content">{item.body}</div>
        </div>

        <div className="popup__actions">
          <button className="popup__btn" onClick={close}>知道了</button>
        </div>
      </div>
    </>
  );
}

// 內建樣式（如果不想額外引入 /styles/popup.css）
const popupCss = `
.popup-mask{position:fixed;inset:0;background:rgba(0,0,0,.45);opacity:0;pointer-events:none;transition:.25s;z-index:60}
.popup-mask.is-open{opacity:1;pointer-events:auto}
.popup{position:fixed;left:50%;top:50%;transform:translate(-50%,-40%) scale(.96);opacity:0;z-index:61;width:min(560px,92vw);border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(17,23,40,.75);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 20px 60px rgba(0,0,0,.45);transition:opacity .25s,transform .25s}
.popup.is-open{opacity:1;transform:translate(-50%,-50%) scale(1)}
.popup--neon{box-shadow:0 20px 60px rgba(0,0,0,.45),0 0 24px rgba(80,160,255,.25) inset,0 0 24px rgba(80,160,255,.25)}
.popup--aurora{background:radial-gradient(1200px 400px at 30% -10%,rgba(120,80,255,.25),transparent),radial-gradient(800px 300px at 80% 110%,rgba(0,220,180,.18),transparent),rgba(17,23,40,.72)}
.popup__close{position:absolute;right:10px;top:8px;width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font-size:20px}
.popup__body{padding:22px 22px 6px}
.popup__title{font-weight:800;font-size:18px;letter-spacing:.02em;margin:0 0 8px}
.popup__content{white-space:pre-wrap;line-height:1.6;color:#eaf2ff}
.popup__actions{display:flex;justify-content:flex-end;gap:10px;padding:12px 18px 18px}
.popup__btn{padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(255,255,255,.06));color:#fff;font-weight:700}
.popup-anim--fade{transition:opacity .22s}
.popup-anim--zoom{transform:translate(-50%,-45%) scale(.9)}
.popup-anim--zoom.is-open{transform:translate(-50%,-50%) scale(1)}
.popup-anim--slide-up{transform:translate(-50%,-30%)}
.popup-anim--slide-up.is-open{transform:translate(-50%,-50%)}
`;
