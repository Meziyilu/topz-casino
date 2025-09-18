// app/shop/[code]/page.tsx
export const dynamic = "force-dynamic";

import ShopItemClient from "@/components/shop/ShopItemClient";
import { absUrl } from "@/lib/abs-url";

async function fetchItem(code: string) {
  const r = await fetch(absUrl(`/api/shop/item/${encodeURIComponent(code)}`), { cache: "no-store" });
  if (!r.ok) throw new Error("NOT_FOUND");
  return (await r.json()) as { item: any };
}
async function fetchMe() {
  const r = await fetch(absUrl("/api/me"), { cache: "no-store" });
  if (!r.ok) return { me: null as any };
  return (await r.json()) as { me: any | null };
}

export default async function ShopItemPage({ params }: { params: { code: string } }) {
  const [{ item }, { me }] = await Promise.all([fetchItem(params.code), fetchMe()]);
  return (
    <main className="shop-wrap">
      <h1 className="shop-title">{item.title}</h1>
      <ShopItemClient item={item} me={me} />
      {/* 載入樣式（public/ 下用 <link>） */}
      <link rel="stylesheet" href="/styles/shop.css" />
      <link rel="stylesheet" href="/styles/headframes-thumb.css" />
      <link rel="stylesheet" href="/styles/tryon.css" />
    </main>
  );
}
