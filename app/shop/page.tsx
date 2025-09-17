export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { formatUnit, symbolOf } from "@/lib/shop";

async function getCatalog() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_ORIGIN || ""}/api/shop/catalog`, { cache: "no-store" });
  if (!res.ok) throw new Error("failed");
  return res.json() as Promise<{ items: { id:string; code:string; title:string; imageUrl?:string|null; kind:string; currency:"COIN"|"DIAMOND"|"TICKET"|"GACHA_TICKET"; priceFrom:number; limitedQty:number|null }[] }>;
}

export default async function ShopPage() {
  const { items } = await getCatalog();

  return (
    <main className="shop-wrap">
      <h1 className="shop-title">商店</h1>
      <div className="shop-grid">
        {items.map(it => (
          <Link key={it.id} href={`/shop/${it.code}`} className="shop-card">
            {it.imageUrl ? (
              /\.(webm|mp4)$/i.test(it.imageUrl)
                ? <video width={320} height={200} autoPlay muted loop playsInline><source src={it.imageUrl} /></video>
                : <Image src={it.imageUrl} alt={it.title} width={320} height={200} />
            ) : <div className="thumb noimg">—</div>}
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
    </main>
  );
}
