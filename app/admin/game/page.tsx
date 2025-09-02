// app/admin/game/page.tsx
async function fetchBaccarat() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  try {
    const r = await fetch(`${base}/api/admin/baccarat/rounds?take=50`, { cache: "no-store" });
    if (!r.ok) return { rounds: [] };
    return await r.json();
  } catch { return { rounds: [] }; }
}
async function fetchOps() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const to = new Date();
  const from = new Date(Date.now() - 24 * 3600 * 1000);
  const r = await fetch(`${base}/api/admin/reports/ops?from=${from.toISOString()}&to=${to.toISOString()}`, { cache: "no-store" });
  return r.json();
}
export default async function GamePage() {
  const [bac, ops] = await Promise.all([fetchBaccarat(), fetchOps()]);
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">遊戲總覽</h1>

      <section className="rounded-lg bg-white border p-4">
        <div className="font-medium mb-2">百家樂（最近局）</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead><tr>
              <th className="text-left px-3 py-2">局ID</th>
              <th className="text-left px-3 py-2">房間</th>
              <th className="text-left px-3 py-2">結果</th>
              <th className="text-left px-3 py-2">時間</th>
            </tr></thead>
            <tbody>
              {(bac.rounds ?? []).map((r:any)=>(
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.id}</td>
                  <td className="px-3 py-2">{r.roomCode}</td>
                  <td className="px-3 py-2">{r.outcome}</td>
                  <td className="px-3 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg bg-white border p-4">
        <div className="font-medium mb-2">近 24h 遊戲營運概況</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded border p-3">
            <div className="text-xs text-zinc-500">下注總額</div>
            <div className="text-xl font-semibold">{ops.betSum ?? 0}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-xs text-zinc-500">派彩總額</div>
            <div className="text-xl font-semibold">{ops.payoutSum ?? 0}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-xs text-zinc-500">毛利(下注-派彩)</div>
            <div className="text-xl font-semibold">{ops.gross ?? 0}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-xs text-zinc-500">Ledger 類型數</div>
            <div className="text-xl font-semibold">{(ops.ledgerAgg ?? []).length}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
