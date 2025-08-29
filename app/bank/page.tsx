// app/bank/page.tsx
"use client";

import NavBar from "@/components/NavBar";
import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";

const fetcher = (u: string) =>
  fetch(u, { credentials: "include", cache: "no-store" }).then((r) => r.json());

export default function BankPage() {
  const { data, mutate } = useSWR("/api/wallet", fetcher);
  const [amount, setAmount] = useState(100);

  async function transfer(direction: "IN" | "OUT") {
    const r = await fetch("/api/wallet", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: direction === "IN" ? "BANK_TO_WALLET" : "WALLET_TO_BANK",
        amount,
      }),
    });
    const j = await r.json();
    if (!r.ok) alert(j?.error || "失敗");
    mutate();
  }

  return (
    <main className="min-h-screen bg-casino-bg text-white">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="card glass">
          <h2 className="text-xl font-bold mb-3">錢包 / 銀行</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded bg-white/5">
              <div className="text-white/70 text-sm">錢包餘額</div>
              <div className="text-2xl font-extrabold">{data?.balance ?? 0}</div>
            </div>
            <div className="p-4 rounded bg-white/5">
              <div className="text-white/70 text-sm">銀行餘額</div>
              <div className="text-2xl font-extrabold">{data?.bankBalance ?? 0}</div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <input
              type="number"
              min={1}
              className="px-3 py-2 rounded bg-white/10 border border-white/15"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.currentTarget.value || "0", 10))}
            />
            <button className="btn" onClick={() => transfer("IN")}>銀行 → 錢包</button>
            <button className="btn" onClick={() => transfer("OUT")}>錢包 → 銀行</button>
            <Link href="/lobby" className="ml-auto underline text-white/80 hover:text-white">返回大廳</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
