// app/admin/layout.tsx
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sess = await getAdminSession();
  if (!sess) redirect("/admin/auth/login?next=/admin");
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr] bg-zinc-50 text-zinc-900">
      <aside className="bg-zinc-950 text-zinc-200 p-4 space-y-2">
        <div className="text-xl font-bold mb-4">Topz Admin</div>
        <nav className="space-y-1">
          <a className="block rounded px-3 py-2 hover:bg-zinc-800" href="/admin">📊 儀表板</a>
          <a className="block rounded px-3 py-2 hover:bg-zinc-800" href="/admin/players">👥 玩家</a>
          <a className="block rounded px-3 py-2 hover:bg-zinc-800" href="/admin/ledger">💳 交易</a>
          <a className="block rounded px-3 py-2 hover:bg-zinc-800" href="/admin/game">🎮 遊戲</a>
          <a className="block rounded px-3 py-2 hover:bg-zinc-800" href="/admin/content">📢 內容</a>
          <a className="block rounded px-3 py-2 hover:bg-zinc-800" href="/admin/config">⚙️ 設定</a>
        </nav>
      </aside>
      <main className="p-6">{children}</main>
    </div>
  );
}
