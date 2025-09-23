// mobile/src/api.ts
const USE_STUB = true; // 先看畫面用；要串真的就改成 false

export type Me = { displayName: string; balance: number; bankBalance: number; vipTier: number };

export async function me(): Promise<Me> {
  if (USE_STUB) {
    return Promise.resolve({
      displayName: "Tester",
      balance: 1000,
      bankBalance: 5000,
      vipTier: 3,
    });
  }
  const API_BASE = process.env.API_BASE ?? "https://topz-casino.onrender.com";
  const res = await fetch(`${API_BASE}/api/profile/me`, { method: "GET" });
  if (!res.ok) throw new Error(`GET /api/profile/me ${res.status}`);
  return res.json();
}
