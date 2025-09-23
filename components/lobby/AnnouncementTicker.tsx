// components/lobby/AnnouncementTicker.tsx
"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type ActiveItem = { id: string; text: string };

type Props = {
  items?: string[];           // 可外部傳；沒傳就自行 fetch
  gap?: number;               // 訊息間距 px
  pxPerSec?: number;          // 每秒位移 px（會依內容寬自動換算 duration）
  fallback?: string[];        // 拿不到資料時顯示
  debug?: boolean;            // 開 debug log
  refreshMs?: number;         // 每隔多久重抓一次
};

export default function AnnouncementTicker({
  items,
  gap = 48,
  pxPerSec = 80,
  fallback = ["🎉 歡迎來到 TOPZ CASINO"],
  debug = false,
  refreshMs = 5 * 60 * 1000,
}: Props) {
  const [autoItems, setAutoItems] = useState<string[]>([]);
  const data = useMemo(
    () => (items && items.length ? items : autoItems),
    [items, autoItems]
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  const chunkRef = useRef<HTMLDivElement>(null);
  const [chunkWidth, setChunkWidth] = useState<number>(0);

  // ── 抓 API（只有在外部沒傳 items 時才抓）
  useEffect(() => {
    if (items && items.length) return;

    let alive = true;
    const load = async () => {
      try {
        // 加上時間參數避免任何中間層快取
        const r = await fetch(`/api/marquee/active?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(String(r.status));
        const d = (await r.json()) as { items?: ActiveItem[] };
        const texts =
          d.items?.map((m) => (m?.text ?? "").trim()).filter(Boolean) ?? [];
        if (debug) console.log("[Ticker] api items:", texts);
        if (alive) setAutoItems(texts.length ? texts : fallback);
      } catch (e) {
        if (debug) console.warn("[Ticker] api error:", e);
        if (alive) setAutoItems(fallback);
      }
    };

    load();
    const id = setInterval(load, refreshMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [items, fallback, refreshMs, debug]);

  // ── 量測「單份內容」寬度（只在內容變/resize 時做）
  useLayoutEffect(() => {
    const measure = () => {
      const el = chunkRef.current;
      if (!el) return;
      const w = el.getBoundingClientRect().width;
      setChunkWidth(w);
      if (debug) console.log("[Ticker] measure width:", w);
    };
    measure();

    // 觀察內容字體/字串變化導致的 reflow
    const obs = new ResizeObserver(measure);
    if (chunkRef.current) obs.observe(chunkRef.current);
    window.addEventListener("resize", measure);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [data, debug]);

  if (!data.length) return null;

  // 根據內容寬度推算動畫秒數（越長越久 → 速度一致）
  const durationSec = chunkWidth > 0 ? Math.max(6, chunkWidth / pxPerSec) : 12;

  return (
    <div
      ref={wrapRef}
      className="tc-wrap"
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        minHeight: 28,
        display: "flex",
        alignItems: "center",
      }}
      aria-label="跑馬燈"
    >
      <div
        className="tc-rail"
        style={{
          display: "inline-flex",
          whiteSpace: "nowrap",
          // 用 CSS 變數把寬度與時間餵給 keyframes
          ["--w" as any]: `${chunkWidth}px`,
          ["--d" as any]: `${durationSec}s`,
          animation: chunkWidth
            ? "marquee var(--d) linear infinite"
            : undefined,
        }}
      >
        {/* 兩份內容做無縫滾動 */}
        <div ref={chunkRef} className="tc-chunk" style={{ display: "inline-flex" }}>
          {data.map((t, i) => (
            <span
              key={`a-${i}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                paddingRight: gap,
                fontWeight: 700,
              }}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="tc-chunk" style={{ display: "inline-flex" }}>
          {data.map((t, i) => (
            <span
              key={`b-${i}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                paddingRight: gap,
                fontWeight: 700,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* keyframes（放本元件內，避免全域污染） */}
      <style jsx>{`
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(calc(var(--w) * -1));
          }
        }
      `}</style>
    </div>
  );
}
