import HeadframeSelector from "@/components/profile/HeadframeSelector";

// **重要**：此頁是 Server Component，讀取使用者資料時通常要用 cookie，請確保對應 API 跑在 nodejs runtime。
// 若你用 fetch 讀 cookie 需用絕對網址（可用 NEXT_PUBLIC_APP_ORIGIN），或者在 Client Component 內呼叫再傳進來。

type MeResp = {
  headframe: "NONE" | "GOLD" | "NEON" | "CRYSTAL" | "DRAGON";
  ownedHeadframes: ("NONE" | "GOLD" | "NEON" | "CRYSTAL" | "DRAGON")[];
};

export const dynamic = "force-dynamic"; // 取用 cookie 的頁面保險起見

export default async function StylePage() {
  // 你可以改成呼叫你真實的 API，例如：
  // const base = process.env.NEXT_PUBLIC_APP_ORIGIN!;
  // const res = await fetch(`${base}/api/profile/me`, { cache: "no-store", headers: { cookie: ... } });
  // const me = (await res.json()) as MeResp;
  // 這裡為了示範，先假資料：
  const me: MeResp = {
    headframe: "NEON",
    ownedHeadframes: ["NONE", "GOLD", "NEON"],
  };

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-100">外觀樣式 / 頭框</h1>
      <p className="mb-6 text-sm text-slate-400">
        這裡可以快速切換你的玩家頭框。購買後也能在商店結帳時選「立即裝備」。
      </p>

      <HeadframeSelector owned={me.ownedHeadframes} equipped={me.headframe} />
    </main>
  );
}
