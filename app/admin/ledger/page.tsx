// app/admin/ledger/page.tsx
async function fetchLedger() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const r = await fetch(`${base}/api/admin/ledger/list`, { cache: "no-store" });
  return r.json();
}
export default async function LedgerPage() {
  const s = await fetchLedger();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">交易紀錄</h1>
      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-100">
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">User</th>
              <th className="text-left px-3 py-2">類型</th>
              <th className="text-left px-3 py-2">金額</th>
              <th className="text-left px-3 py-2">備註</th>
              <th className="text-left px-3 py-2">時間</th>
            </tr>
          </thead>
          <tbody>
            {(s.items ?? []).map((x: any) => (
              <tr key={x.id} className="border-t">
                <td className="px-3 py-2">{x.id}</td>
                <td className="px-3 py-2">{x.userId}</td>
                <td className="px-3 py-2">{x.type}</td>
                <td className="px-3 py-2">{x.amount}</td>
                <td className="px-3 py-2">{x.memo ?? ""}</td>
                <td className="px-3 py-2">{new Date(x.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
