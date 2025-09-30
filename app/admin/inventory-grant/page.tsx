"use client";
import "@/public/styles/inventory.css";
import { useState } from "react";

export default function AdminInventoryGrantPage() {
  const [form, setForm] = useState({ userId:"", type:"HEADFRAME", refId:"GOLD", quantity:1, durationDays:"" });
  const [msg, setMsg] = useState("");

  async function submit() {
    const payload:any = {
      userId: form.userId,
      type: form.type,
      refId: form.refId || null,
      quantity: Number(form.quantity || 1),
    };
    if (form.type === "HEADFRAME") {
      payload.durationDays = form.durationDays === "" ? null : Number(form.durationDays);
    }
    const r = await fetch("/api/inventory/grant", { method:"POST", body: JSON.stringify(payload) });
    const j = await r.json(); setMsg(j.ok? "已發送" : j.error ?? "失敗");
  }

  return (
    <main className="admin inventory-grant">
      <h1>管理端直發背包</h1>
      <div className="grant-form glass">
        <input placeholder="User ID" value={form.userId} onChange={e=>setForm({ ...form, userId:e.target.value })} />
        <select value={form.type} onChange={e=>setForm({ ...form, type: e.target.value })}>
          <option>HEADFRAME</option>
          <option>BADGE</option>
          <option>COLLECTIBLE</option>
          <option>OTHER</option>
        </select>
        <input placeholder="refId（HEADFRAME=HeadframeCode / BADGE=badgeId / ...）"
               value={form.refId} onChange={e=>setForm({ ...form, refId:e.target.value })} />
        <input type="number" placeholder="數量" value={form.quantity}
               onChange={e=>setForm({ ...form, quantity:e.target.value as any })} />
        {form.type==="HEADFRAME" && (
          <input type="number" placeholder="有效天數（空=永久）"
                 value={form.durationDays} onChange={e=>setForm({ ...form, durationDays:e.target.value })} />
        )}
        <button onClick={submit}>發送</button>
        {msg && <p className="tip">{msg}</p>}
      </div>
    </main>
  );
}
