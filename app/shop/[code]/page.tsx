// app/shop/[code]/page.tsx
export const dynamic = "force-dynamic";

import ShopItemClient from "@/components/shop/ShopItemClient";
import { absUrl } from "@/lib/abs-url";

async function fetchItem(code: string) {
  const res = await fetch(absUrl(`/api/shop/item/${encodeURIComponent(code)}`), { cache: "no-store" });
  if (!res.ok) throw new Error("failed");
  return res.json() as Promise<{ item: any }>;
}

async function fetchMe() {
  // 取登入者資訊（未登入時 200/401 都回 me:null）
  const res = await fetch(absUrl("/api/me"), { cache: "no-store" });
  if (!res.ok) return { me: null as any };
  return res.json() as Promise<{ me: any | null }>;
}

export default async function ShopItemPage({ params }: { params: { code: string } }) {
  const [{ item }, { me }] = await Promise.all([fetchItem(params.code), fetchMe()]);
  return (
    <main className="shop-item">
      <h1>{item.title}</h1>
      <ShopItemClient item={item} me={me} />
    </main>
  );
}
