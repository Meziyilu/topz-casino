"use client";
import { useEffect, useState } from "react";

type Ann = {
  id: string; title: string; content: string;
  enabled: boolean; startAt: string | null; endAt: string | null;
  createdAt: string;
};

export default function AdminAnnouncementsPage() {
  const [list, setList] = useState<Ann[]>([]);
  const [form, setForm] = useState<Partial<Ann>>({
    title: "", content: "", enabled: true, startAt: null, endAt: null,
  });

  async function load() {
    const r = await fetch("/api/admin/announcements", { cache: "no-store" });
    setList(await r.json());
  }

  async function create() {
    await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ title: "", content: "", enabled: true, startAt: null, endAt: null });
    load();
  }

  async function toggle(id: string, enabled: boolean) {
    await fetch(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("確定刪除？")) return;
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">公告欄管理</h1>

      <div className="grid gap-2 md:grid-cols-2">
        <input className="border p-2 rounded" placeholder="標題"
          value={form.title ?? ""} onChange={e=>setForm(f=>({...f, title:e.target.value}))} />
        <input className="border p-2 rounded md:col-span-2" placeholder="內容"
          value={form.content ?? ""} onChange={e=>setForm(f=>({...f, content:e.target.value}))} />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!form.enabled}
            onChange={e=>setForm(f=>({...f, enabled:e.target.checked}))}/>
          啟用
        </label>
        <input className="border p-2 rounded" type="datetime-local" placeholder="開始時間"
          onChange={e=>setForm(f=>({...f, startAt: e.target.value ? new Date(e.target.value).toISOString() : null}))}/>
        <input className="border p-2 rounded" type="datetime-local" placeholder="結束時間"
          onChange={e=>setForm(f=>({...f, endAt: e.target.value ? new Date(e.target.value).toISOString() : null}))}/>
        <button className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={create}>新增公告</button>
      </div>

      <div className="divide-y">
        {list.map(a=>(
          <div key={a.id} className="py-3 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold">{a.title} {a.enabled ? "" : <span className="text-red-500">(停用)</span>}</div>
              <div className="text-sm text-gray-600 whitespace-pre-wrap">{a.content}</div>
              <div className="text-xs text-gray-500 mt-1">
                {a.startAt ? `開始：${new Date(a.startAt).toLocaleString()}` : "開始：無"} ｜ {a.endAt ? `結束：${new Date(a.endAt).toLocaleString()}` : "結束：無"}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button className="px-3 py-1 rounded border"
                onClick={()=>toggle(a.id, !a.enabled)}>{a.enabled ? "停用" : "啟用"}</button>
              <button className="px-3 py-1 rounded border border-red-500 text-red-600"
                onClick={()=>remove(a.id)}>刪除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
