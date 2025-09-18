// app/shop/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { absUrl } from "@/lib/abs-url";
import { formatUnit, symbolOf } from "@/lib/shop";

type CatalogItem = {
  id: string;
  code: string;
  title: string;
  imageUrl?: string | null;
  kind: "HEADFRAME" | "BADGE" | "BUNDLE" | "OTHER";
  currency: "COIN" | "DIAMOND" | "TICKET" | "GACHA_TICKET";
  priceFrom: number;
  limitedQty: number | null;
};

async function getCatalog(): Promise<CatalogItem[]> {
  try {
    // 先試相對路徑；SSR 本地環境可用
    let r = await fetch("/api/shop/catalog", { cache: "no-store" });
    if (!r.ok) r = await fetch(absUrl("/api/shop/catalog"), { cache: "no-store" });
    if (!r.ok) throw new Error("bad status");
    const j = await r.json();
    return Array.isArray(j?.items) ? j.items : [];
  } catch {
    return [];
  }
}

function effectFromItem(it: CatalogItem): "neon" | "crystal" | "dragon" | null {
  const t = `${it.code} ${it.title} ${it.kind}`.toUpperCase();
  if (t.includes("NEON")) return "neon";
  if (t.includes("CRYSTAL")) return "crystal";
  if (t.includes("DRAGON")) return "dragon";
  return it.kind === "HEADFRAME" ? "neon" : null;
}

function Media({ it }: { it: CatalogItem }) {
  const src = it.imageUrl || "";
  if (src) {
    if (/\.(webm|mp4)$/i.test(src)) {
      return (
        <video width={320} height={200} autoPlay muted loop playsInline>
          <source src={src} />
        </video>
      );
    }
    if (/\.gif$/i.test(src)) {
      return <img src={src} alt={it.title} width={320} height={200} />;
    }
    return <Image src={src} alt={it.title} width={320} height={200} />;
  }
  const fx = effectFromItem(it);
  if (fx) return <div className={`hf hf-${fx}`}><div className="avatar" /></div>;
  return <div className="thumb noimg">—</div>;
}

export default async function ShopPage() {
  const items = await getCatalog();

  return (
    <main className="shop-wrap">
      <h1 className="shop-title">商店</h1>
      {!items.length && (
        <p style={{ opacity: .8, marginBottom: 12 }}>
          暫無上架商品（請在後台新增或執行 seed）。
        </p>
      )}

      <div className="shop-grid">
        {items.map((it) => (
          <Link key={it.id} href={`/shop/iteam/${encodeURIComponent(it.code)}`} className="shop-card">
            <Media it={it} />
            <div className="shop-card-body">
              <div className="shop-card-title">{it.title}</div>
              <div className="shop-card-sub">
                <span className="pill">{it.kind}</span>
                <span className="pill">{symbolOf(it.currency)}</span>
                <span className="price">{formatUnit(it.priceFrom, it.currency)} 起</span>
                {it.limitedQty != null && <span className="stock">剩 {it.limitedQty}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 載入商店樣式與頭框縮圖特效 */}
      <link rel="stylesheet" href="/styles/shop.css" />
      <link rel="stylesheet" href="/styles/headframes-thumb.css" />
    </main>
  );
}
