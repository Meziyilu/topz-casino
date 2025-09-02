import fetch from "node-fetch";
export async function pingLottoState(base = "http://localhost:3000"): Promise<void> {
  try { await fetch(`${base}/api/lotto/state`, { cache: "no-store" }); } catch { /* ignore */ }
}
