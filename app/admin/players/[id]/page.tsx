// app/admin/players/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  async function adjust() {
    setMsg("");
    const key = crypto.randomUUID();
    const res = await fetch(`/api/admin/users/${id}/adjust`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-idempotency-key": key },
      body: JSON.stringify({ amount, reason }),
    });
    const j = await res.json();
    setMsg(res.ok ? "OK ✅" : `❌ ${j?.error || "失敗"}`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">玩家 {id}</h1>
      <div className="rounded-lg bg-white border p-4 space-y-3 max-w-xl">
        <div className="font-medium">資產調整</div>
        <div className="flex items-center gap-2">
          <input className="border rounded px-3 py-2 w-40" type="number" value={amount} onChange={e=>setAmount(parseInt(e.target.value||"0",10))} placeholder="金額(+/-)" />
          <input className="border rounded px-3 py-2 flex-1" value={reason} onChange={e=>setReason(e.target.value)} placeholder="原因備註" />
          <button onClick={adjust} className="bg-black text-white px-4 py-2 rounded">送出</button>
        </div>
        {msg && <div className="text-sm">{msg}</div>}
        <div className="text-xs text-zinc-500">提示：高風險金額建議走雙簽流程。</div>
      </div>
    </div>
  );
}
