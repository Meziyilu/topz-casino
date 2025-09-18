// app/shop/iteam/[code]/page.tsx
export const dynamic = "force-dynamic";

import ShopItemClient from "@/components/shop/ShopItemClient";
import { absUrl } from "@/lib/abs-url";

async function fetchItem(code: string) {
  const r1 = await fetch(`/api/shop/item/${encodeURIComponent(code)}`, { cache: "no-store" });
  if (r1.ok) return r1.json();
  const r2 = await fetch(absUrl(`/api/shop/item/${encodeURIComponent(code)}`), { cache: "no-store" });
  if (!r2.ok) throw new Error("NOT_FOUND");
  return r2.json();
}
async function fetchMe() {
  try {
    const r1 = await fetch("/api/me", { cache: "no-store" });
    if (r1.ok) return r1.json();
    const r2 = await fetch(absUrl("/api/me"), { cache: "no-store" });
    if (r2.ok) return r2.json();
  } catch {}
  return { me: null };
}

export default async function ShopIteamPage({ params }: { params: { code: string } }) {
  const [{ item }, { me }] = await Promise.all([fetchItem(params.code), fetchMe()]);
  return (
    <main className="shop-wrap">
      <h1 className="shop-title">{item.title}</h1>
      <ShopItemClient item={item} me={me} />
      <link rel="stylesheet" href="/styles/shop.css" />
      <link rel="stylesheet" href="/styles/headframes-thumb.css" />
      <link rel="stylesheet" href="/styles/tryon.css" />
    </main>
  );
}
