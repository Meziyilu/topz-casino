"use client";

import { useEffect, useState } from "react";

type Msg = {
  id: string; text: string; priority: number; enabled: boolean;
  startAt?: string | null; endAt?: string | null; createdAt: string;
};

export default function AdminMarqueeView() {
  const [list, setList] = useState<Msg[]>([]);
  const [form, setForm] = useState({ text: "", priority: 0, enabled: true, startAt: "", endAt: "" });

  async function load() {
    const res = await fetch("/api/admin/marquee?enabled=", { cache: "no-store" });
    const json = await res.json();
    setList(json.items || []);
  }
  useEffect(()=>{ load(); }, []);

  async function submitNew(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload: any = {
      text: form.text,
      priority: Number(form.priority) || 0,
      enabled: form.enabled,
      startAt: form.startAt || undefined,
      endAt: form.endAt || undefined,
    };
    await fetch("/api/admin/marquee", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
    setForm({ text:"", priority:0, enabled:true, startAt:"", endAt:"" });
    load();
  }

  async function toggle(id: string, enabled: boolean) {
    await fetch(`/api/admin/marquee/${id}`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ enabled }) });
    load();
  }

  async function remove(id: string) {
    if (!confirm("確定刪除？")) return;
    await fetch(`/api/admin/marquee/${id}`, { method:"DELETE" });
    load();
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>跑馬燈管理</h1>

      <form onSubmit={submitNew} style={{ display:"grid", gap:8, maxWidth: 780, margin:"12px 0" }}>
        <input placeholder="文字內容" value={form.text} onChange={e=>setForm(v=>({ ...v, text: e.target.value }))} />
        <div style={{ display:"flex", gap:8 }}>
          <input type="number" placeholder="priority（越大越前）" value={form.priority} onChange={e=>setForm(v=>({ ...v, priority: Number(e.target.value) }))} />
          <label><input type="checkbox" checked={form.enabled} onChange={e=>setForm(v=>({ ...v, enabled: e.target.checked }))} /> 啟用</label>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input type="datetime-local" value={form.startAt} onChange={e=>setForm(v=>({ ...v, startAt: e.target.value }))} />
          <input type="datetime-local" value={form.endAt} onChange={e=>setForm(v=>({ ...v, endAt: e.target.value }))} />
        </div>
        <button type="submit">新增</button>
      </form>

      <table border={1} cellPadding={6}>
        <thead>
          <tr><th>狀態</th><th>優先度</th><th>內容</th><th>時間窗</th><th>操作</th></tr>
        </thead>
        <tbody>
          {list.map(it=>(
            <tr key={it.id}>
              <td>{it.enabled ? "啟用" : "停用"}</td>
              <td>{it.priority}</td>
              <td>{it.text}</td>
              <td>
                {(it.startAt ? new Date(it.startAt).toLocaleString() : "—")} ~ {(it.endAt ? new Date(it.endAt).toLocaleString() : "—")}
              </td>
              <td style={{ whiteSpace:"nowrap" }}>
                <button onClick={()=>toggle(it.id, !it.enabled)}>{it.enabled ? "停用" : "啟用"}</button>{" "}
                <button onClick={()=>remove(it.id)}>刪除</button>
              </td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan={5}>尚無資料</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
