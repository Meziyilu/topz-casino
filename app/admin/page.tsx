// app/admin/page.tsx
async function getData() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const r = await fetch(`${base}/api/admin/dashboard`, { cache: "no-store" });
  return r.json();
}
function Card({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg bg-white shadow border p-4">
      <div className="text-sm text-zinc-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-zinc-400 mt-1">{hint}</div>}
    </div>
  );
}
export default async function AdminDashboard() {
  const s = await getData();
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">儀表板</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="今日註冊" value={s.regCount ?? 0} />
        <Card title="活躍(24h)" value={s.activeCount ?? 0} />
        <Card title="今日存入" value={s.depositSum ?? 0} />
        <Card title="今日提領" value={s.withdrawSum ?? 0} />
      </div>
      <div className="rounded-lg bg-white border p-4">
        <div className="font-medium mb-2">最近 20 筆交易</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead><tr><th className="text-left px-3 py-2">ID</th><th className="text-left px-3 py-2">User</th><th className="text-left px-3 py-2">類型</th><th className="text-left px-3 py-2">金額</th><th className="text-left px-3 py-2">時間</th></tr></thead>
            <tbody>
              {(s.recent ?? []).map((x: any) => (
                <tr key={x.id} className="border-t">
                  <td className="px-3 py-2">{x.id}</td>
                  <td className="px-3 py-2">{x.userId}</td>
                  <td className="px-3 py-2">{x.type}</td>
                  <td className="px-3 py-2">{x.amount}</td>
                  <td className="px-3 py-2">{new Date(x.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
