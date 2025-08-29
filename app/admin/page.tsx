// app/admin/page.tsx
import Link from "next/link";
import NavBar from "@/components/NavBar";

export default function AdminPage() {
  return (
    <div className="min-h-screen p-6 space-y-6">
      <NavBar />
      <div className="glass p-6 rounded-xl">
        <h1 className="text-2xl font-bold mb-4">管理員面板</h1>
        {/* ……你的管理員工具（調整金幣、重啟房間等）…… */}
        <div className="mt-6">
          <Link href="/lobby" className="btn">返回大廳</Link>
        </div>
      </div>
    </div>
  );
}
