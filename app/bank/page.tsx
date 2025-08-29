// app/bank/page.tsx
import Link from "next/link";
import NavBar from "@/components/NavBar";

export default function BankPage() {
  return (
    <div className="min-h-screen p-6 space-y-6">
      <NavBar />
      <div className="glass p-6 rounded-xl">
        <h1 className="text-2xl font-bold mb-4">銀行</h1>
        {/* ……你的銀行內容（轉入轉出等）…… */}
        <div className="mt-6">
          <Link href="/lobby" className="btn">返回大廳</Link>
        </div>
      </div>
    </div>
  );
}
