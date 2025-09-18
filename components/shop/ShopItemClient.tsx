// components/shop/ShopItemClient.tsx
"use client";

import { useMemo, useRef, useState } from "react";

type HeadframeKey = "neon" | "crystal" | "dragon";
type Item = {
  id: string;
  code: string;
  title: string;
  kind: string; // HEADFRAME / ...
  imageUrl?: string | null;
  currency: "COIN" | "DIAMOND" | "TICKET" | "GACHA_TICKET";
  basePrice?: number | null;
  skus?: {
    id: string;
    code: string;
    title: string | null;
    priceOverride: number | null;
    currencyOverride: Item["currency"] | null;
    metaJson?: any | null; // 建議在 seed 時把 { headframe: "NEON"|"CRYSTAL"|"DRAGON", durationDays: 7 }
  }[];
};

function guessFrameFromText(s: string): HeadframeKey | null {
  const t = (s || "").toUpperCase();
  if (t.includes("NEON")) return "neon";
  if (t.includes("CRYSTAL")) return "crystal";
  if (t.includes("DRAGON")) return "dragon";
  return null;
}

function toHeadframeKey(sku: Item["skus"][number]): HeadframeKey | null {
  const hf = sku?.metaJson?.headframe?.toUpperCase?.();
  if (hf === "NEON") return "neon";
  if (hf === "CRYSTAL") return "crystal";
  if (hf === "DRAGON") return "dragon";
  return guessFrameFromText(`${sku.title} ${sku.code}`);
}

function priceOf(item: Item, sku?: Item["skus"][number]) {
  const price = sku?.priceOverride ?? item.basePrice ?? 0;
  const cur = sku?.currencyOverride ?? item.currency;
  return { price, currency: cur };
}

export default function ShopItemClient({ item, me }: { item: Item; me: any }) {
  // 建立可切換的頭框清單（來自 SKU）
  const frameOptions = useMemo(() => {
    if (!item?.skus?.length) return [] as { label: string; key: HeadframeKey; skuId: string }[];
    const rows: { label: string; key: HeadframeKey; skuId: string }[] = [];
    for (const s of item.skus) {
      const key = toHeadframeKey(s);
      if (!key) continue;
      rows.push({ label: s.title || s.code, key, skuId: s.id });
    }
    // 如果沒有任何能判斷的，給一個預設
    return rows.length ? rows : [{ label: "Neon 頭框", key: "neon", skuId: item.skus[0].id }];
  }, [item]);

  const [activeIdx, setActiveIdx] = useState(0);
  const active = frameOptions[activeIdx] || null;

  // 試戴：使用者頭像
  const [avatarUrl, setAvatarUrl] = useState<string>(me?.avatarUrl || "/assets/avatars/demo.png");
  const fileRef = useRef<HTMLInputElement>(null);

  function onPickFile() {
    fileRef.current?.click();
  }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setAvatarUrl(url);
  }

  // 放大縮小
  const [scale, setScale] = useState(1); // 0.6~1.6
  const [offsetX, setOffsetX] = useState(0); // -80~80
  const [offsetY, setOffsetY] = useState(0); // -80~80

  // 購買（最小流程）
  async function buy() {
    if (!active) return alert("無法辨識 SKU");
    const r = await fetch("/api/shop/buy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ skuId: active.skuId, qty: 1 }),
    });
    const j = await r.json();
    if (!r.ok || !j.ok) return alert(j?.error ?? "購買失敗");
    alert("購買成功！");
  }

  const { price, currency } = priceOf(item, item.skus?.find(s => s.id === active?.skuId));

  return (
    <div className="item-detail">
      {/* 左側：試戴大預覽 */}
      <section className="tryon glass">
        <div className={`tryon-stage hf hf-${active?.key || "neon"}`}>
          <img
            className="tryon-avatar"
            src={avatarUrl}
            alt="avatar"
            style={{
              transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
            }}
          />
        </div>

        <div className="tryon-ctrl">
          <div className="ctrl-row">
            <button className="btn" onClick={onPickFile}>上傳頭像</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          </div>
          <div className="ctrl-row">
            <label>縮放</label>
            <input type="range" min={0.6} max={1.6} step={0.02} value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} />
          </div>
          <div className="ctrl-row">
            <label>水平位移</label>
            <input type="range" min={-80} max={80} step={1} value={offsetX} onChange={(e) => setOffsetX(parseInt(e.target.value))} />
          </div>
          <div className="ctrl-row">
            <label>垂直位移</label>
            <input type="range" min={-80} max={80} step={1} value={offsetY} onChange={(e) => setOffsetY(parseInt(e.target.value))} />
          </div>
        </div>
      </section>

      {/* 右側：SKU 與購買 */}
      <section className="buy-box glass">
        <div className="sku-list">
          {frameOptions.map((o, i) => (
            <button
              key={o.skuId}
              className={`sku-btn ${i === activeIdx ? "active" : ""}`}
              onClick={() => setActiveIdx(i)}
            >
              <div className={`sku-thumb hf hf-${o.key}`} />
              <div className="sku-meta">
                <div className="sku-title">{o.label}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="buy-row">
          <div className="price">
            <b>{price.toLocaleString()}</b> <span>{currency}</span>
          </div>
          <button className="btn primary" onClick={buy}>立即購買</button>
        </div>
      </section>
    </div>
  );
}
