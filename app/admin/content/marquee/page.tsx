"use client";

import { useEffect, useState } from "react";
import "@/../public/styles/admin-content.css";

type Marquee = {
  id: string;
  text: string;
  enabled: boolean;
  priority: number;
  createdAt?: string;
};

export default function AdminMarqueePage() {
  const [list, setList] = useState<Marquee[]>([]);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<number>(0);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Marquee>>({});

  async function load() {
    const res = await fetch("/api/admin/marquee", { cache: "no-store" });
    const data = await res.json();
    setList(data.items ?? []);
  }

  async function create() {
    if (!text.trim()) return;
    setBusy(true);
    await fetch("/api/admin/marquee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, priority, enabled }),
    }).finally(() => setBusy(false));
    setText(""); setPriority(0); setEnabled(true);
    load();
  }

  function openEdit(m: Marquee) {
    setEditId(m.id);
    setEditData({ text: m.text, enabled: m.enabled, priority: m.priority });
  }

  async function saveEdit() {
    if (!editId) return;
    setBusy(true);
    await fetch(`/api/admin/marquee/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    }).finally(() => setBusy(false));
    setEditId(null); setEditData({});
    load();
  }

  async function toggleEnabled(id: string, current: boolean) {
    await fetch(`/api/admin/marquee/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !current }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("確定刪除此條跑馬燈？")) return;
    await fetch(`/api/admin/marquee/${id}`, { method: "DELETE" });
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="admin-wrap">
      <div className="admin-title">內容管理・跑馬燈</div>

      <div className="admin-grid">
        {/* 新增區 */}
        <section className="card">
          <h2>新增跑馬燈</h2>
          <div className="form-row-1">
            <input className="input" placeholder="輸入跑馬燈文字（例如：首儲加碼 50%！）"
                   value={text} onChange={(e) => setText(e.target.value)} maxLength={200} />
          </div>

          <div className="form-row" style={{ marginTop: 10 }}>
            <div>
              <label className="help">優先度（大者先）</label>
              <input type="number" className="input" value={priority}
                     onChange={(e) => setPriority(parseInt(e.target.value || "0", 10))} />
            </div>
            <div style={{ display: "flex", alignItems: "end", gap: 12 }}>
              <label className="switch" title="啟用 / 停用">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                <span className="pill"><span className="dot" /></span>
                <span>{enabled ? "啟用" : "停用"}</span>
              </label>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button className="btn" onClick={create} disabled={busy}>新增</button>
            <button className="btn ghost" onClick={() => { setText(""); setPriority(0); setEnabled(true); }}>清空</button>
          </div>

          <div className="help" style={{ marginTop: 10 }}>
            小技巧：可用 <span className="kbd">{'{}'}</span> 佔位符做 A/B 文案（後台批量新增）。
          </div>
        </section>

        {/* 列表區 */}
        <section className="card">
          <h2>跑馬燈列表</h2>
          <table className="table">
            <thead>
              <tr>
                <th>文字</th>
                <th style={{ width: 110 }}>狀態</th>
                <th style={{ width: 90 }}>優先度</th>
                <th style={{ width: 180 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td>{m.text}</td>
                  <td><span className={m.enabled ? "badge ok" : "badge off"}>{m.enabled ? "啟用" : "停用"}</span></td>
                  <td>{m.priority}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn muted" onClick={() => toggleEnabled(m.id, m.enabled)}>{m.enabled ? "停用" : "啟用"}</button>
                      <button className="btn ghost" onClick={() => openEdit(m)}>編輯</button>
                      <button className="btn warn" onClick={() => remove(m.id)}>刪除</button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={4} className="help">目前沒有跑馬燈，先在左側新增一筆吧。</td></tr>}
            </tbody>
          </table>
        </section>
      </div>

      {/* 編輯面板 */}
      {editId && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>編輯跑馬燈</h2>
          <div className="form-row-1">
            <input className="input" value={editData.text ?? ""} onChange={(e) => setEditData(s => ({ ...s, text: e.target.value }))} />
          </div>
          <div className="form-row" style={{ marginTop: 10 }}>
            <div>
              <label className="help">優先度</label>
              <input type="number" className="input"
                     value={typeof editData.priority === "number" ? editData.priority : 0}
                     onChange={(e) => setEditData(s => ({ ...s, priority: parseInt(e.target.value || "0", 10) }))} />
            </div>
            <div style={{ display: "flex", alignItems: "end", gap: 12 }}>
              <label className="switch">
                <input type="checkbox" checked={!!editData.enabled}
                       onChange={(e) => setEditData(s => ({ ...s, enabled: e.target.checked }))} />
                <span className="pill"><span className="dot" /></span>
                <span>{editData.enabled ? "啟用" : "停用"}</span>
              </label>
            </div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 12 }}>
            <button className="btn" onClick={saveEdit} disabled={busy}>儲存變更</button>
            <button className="btn ghost" onClick={() => { setEditId(null); setEditData({}); }}>取消</button>
          </div>
        </section>
      )}
    </div>
  );
}
