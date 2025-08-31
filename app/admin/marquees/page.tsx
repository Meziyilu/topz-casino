"use client";
import { useEffect, useState } from "react";

type M = { id: string; text: string; enabled: boolean; priority: number; createdAt: string; };

export default function AdminMarqueesPage() {
  const [list, setList] = useState<M[]>([]);
  const [form, setForm] = useState<Partial<M>>({ text: "", enabled: true, priority: 0 });

  async function load() {
    const r = await fetch("/api/admin/marquees", { cache: "no-store" });
    setList(await r.json());
  }

  async function create() {
    await fetch("/api/admin/marquees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ text: "", enabled: true, priority: 0 });
    load();
  }

  async function patch(id: string, data: Partial<M>) {
    await fetch(`/api/admin/marquees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("確定刪除？")) return;
    await fetch(`/api/admin/marquees/${id}`, { method: "DELETE" });
    load();
  }

  useEffect(()=>{ load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">跑馬燈管理</h1>

      <div className="grid gap-2 md:grid-cols-3">
        <input className="border p-2 rounded md:col-span-2" placeholder="跑馬燈文字"
          value={form.text ?? ""} onChange={e=>setForm(f=>({...f, text:e.target.value}))}/>
        <input className="border p-2 rounded" type="number" min={0} max={999} placeholder="優先度(大在前)"
          value={form.priority ?? 0} onChange={e=>setForm(f=>({...f, priority:Number(e.target.value||0)}))}/>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!form.enabled}
            onChange={e=>setForm(f=>({...f, enabled:e.target.checked}))}/>
          啟用
        </label>
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={create}>新增跑馬燈</button>
      </div>

      <div className="divide-y">
        {list.map(m=>(
          <div key={m.id} className="py-3 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold">{m.text} {m.enabled ? "" : <span className="text-red-500">(停用)</span>}</div>
              <div className="text-xs text-gray-500">優先度：{m.priority}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button className="px-3 py-1 rounded border" onClick={()=>patch(m.id, { enabled: !m.enabled })}>
                {m.enabled ? "停用" : "啟用"}
              </button>
              <button className="px-3 py-1 rounded border" onClick={async ()=>{
                const v = prompt("設定優先度(0-999)", String(m.priority));
                if (v==null) return;
                const n = Math.max(0, Math.min(999, Number(v)||0));
                await patch(m.id, { priority: n });
              }}>調整優先度</button>
              <button className="px-3 py-1 rounded border border-red-500 text-red-600" onClick={()=>remove(m.id)}>刪除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
