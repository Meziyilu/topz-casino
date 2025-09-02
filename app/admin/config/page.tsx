// app/admin/config/page.tsx
"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  gameCode: "GLOBAL" | "BACCARAT" | "LOTTO" | "SICBO";
  key: string;
  valueString?: string | null;
  valueInt?: number | null;
  valueFloat?: number | null;
  valueBool?: boolean | null;
  json?: any | null;
  updatedAt?: string;
};

export default function ConfigPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Partial<Row>>({ gameCode: "GLOBAL" });
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const r = await fetch("/api/admin/config/list");
      if (!r.ok) throw 0;
      const j = await r.json();
      setRows(j.items || []);
    } catch { setRows([]); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setMsg("");
    const res = await fetch("/api/admin/config/upsert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editing),
    });
    setMsg(res.ok ? "已儲存 ✅" : "儲存失敗 ❌");
    await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">系統設定（GameConfig）</h1>

      <section className="rounded-lg bg-white border p-4 space-y-3">
        <div className="font-medium">新增 / 更新</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <select className="border rounded px-3 py-2" value={editing.gameCode as string}
            onChange={e=>setEditing({...editing, gameCode: e.target.value as Row["gameCode"]})}>
            <option value="GLOBAL">GLOBAL</option>
            <option value="BACCARAT">BACCARAT</option>
            <option value="LOTTO">LOTTO</option>
            <option value="SICBO">SICBO</option>
          </select>
          <input className="border rounded px-3 py-2" placeholder="key"
            value={editing.key ?? ""} onChange={e=>setEditing({...editing, key: e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="valueString"
            value={editing.valueString ?? ""} onChange={e=>setEditing({...editing, valueString: e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="valueInt" type="number"
            value={editing.valueInt ?? 0} onChange={e=>setEditing({...editing, valueInt: parseInt(e.target.value||"0",10)})}/>
          <input className="border rounded px-3 py-2" placeholder="valueFloat" type="number" step="0.01"
            value={editing.valueFloat ?? 0} onChange={e=>setEditing({...editing, valueFloat: parseFloat(e.target.value||"0")})}/>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!editing.valueBool} onChange={e=>setEditing({...editing, valueBool: e.target.checked})}/>
            valueBool
          </label>
          <textarea className="border rounded px-3 py-2 md:col-span-2" placeholder='json (可留空)'
            value={editing.json ? JSON.stringify(editing.json) : ""} onChange={e=>{
              try { setEditing({...editing, json: e.target.value ? JSON.parse(e.target.value) : null}); }
              catch { /* ignore parse error while typing */ }
            }}/>
        </div>
        <button className="bg-black text-white px-4 py-2 rounded" onClick={save}>儲存</button>
        {msg && <div className="text-sm">{msg}</div>}
      </section>

      <section className="rounded-lg bg-white border p-4">
        <div className="font-medium mb-2">現有設定</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-100">
              <tr>
                <th className="text-left px-3 py-2">Game</th>
                <th className="text-left px-3 py-2">Key</th>
                <th className="text-left px-3 py-2">Value</th>
                <th className="text-left px-3 py-2">更新時間</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.gameCode}</td>
                  <td className="px-3 py-2">{r.key}</td>
                  <td className="px-3 py-2">
                    {r.valueString ?? r.valueInt ?? r.valueFloat ?? (r.valueBool ? "true" : "false")}
                    {r.json ? <pre className="text-xs mt-1
