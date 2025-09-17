export const dynamic = "force-dynamic";
import ShopItemClient from "@/components/shop/ShopItemClient";

async function fetchItem(code: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_ORIGIN || ""}/api/shop/item/${encodeURIComponent(code)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("failed");
  return res.json() as Promise<{ item: any }>;
}
async function fetchMe() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_ORIGIN || ""}/api/me`, { cache:"no-store" });
  if (!res.ok) return { me: null };
  return res.json() as Promise<{ me: any|null }>;
}

export default async function ShopItemPage({ params }: { params: { code: string }}) {
  const [{ item }, { me }] = await Promise.all([fetchItem(params.code), fetchMe()]);
  return (
    <main className="shop-item">
      <h1>{item.title}</h1>
      <ShopItemClient item={item} me={me} />
    </main>
  );
}
