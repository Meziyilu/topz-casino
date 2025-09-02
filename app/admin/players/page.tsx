// app/admin/players/page.tsx
import Link from "next/link";

async function fetchUsers(q: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const r = await fetch(`${base}/api/admin/users/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
  return r.json();
}

export default async function PlayersPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams?.q ?? "";
  const data = await fetchUsers(q);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">玩家列表</h1>
      <form className="flex gap-2" method="get">
        <input name="q" defaultValue={q} className="border rounded px-3 py-2 w-72" placeholder="搜尋 email / 暱稱" />
        <button className="bg-black text-white px-4 py-2 rounded">搜尋</button>
      </form>
      <div className="overflow-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-100">
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">暱稱</th>
              <th className="text-left px-3 py-2">錢包</th>
              <th className="text-left px-3 py-2">銀行</th>
              <th className="text-left px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {(data.items ?? []).map((u: any) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.id}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.name ?? "-"}</td>
                <td className="px-3 py-2">{u.balance}</td>
                <td className="px-3 py-2">{u.bankBalance}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/players/${u.id}`} className="underline">檢視/調整</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
