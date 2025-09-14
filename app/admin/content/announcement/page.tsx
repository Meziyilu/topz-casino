"use client";

import { useEffect, useState } from "react";
import "@/../public/styles/admin-content.css";

type Announcement = {
  id: string;
  title: string;
  body: string;
  enabled: boolean;
  startAt: string | null;
  endAt: string | null;
  createdAt?: string;
};

export default function AdminAnnouncementPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Announcement>>({});

  async function load() {
    const res = await fetch("/api/admin/announcement", { cache: "no-store" });
    const data = await res.json();
    setList(data.items ?? []);
  }

  async function create() {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    await fetch("/api/admin/announcement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, body, enabled,
        startAt: startAt || undefined,
        endAt: endAt || undefined,
      }),
    }).finally(() => setBusy(false));
    setTitle(""); setBody(""); setEnabled(true); setStartAt(""); setEndAt("");
    load();
  }

  function openEdit(a: Announcement) {
    setEditId(a.id);
    setEditData({
      title: a.title,
      body: a.body,
      enabled: a.enabled,
      startAt: a.startAt,
      endAt: a.endAt,
    });
  }

  async function saveEdit() {
    if (!editId) return;
    setBusy(true);
    await fetch(`/api/admin/announcement/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editData.title,
        body: editData.body,
        enabled: editData.enabled,
        startAt: editData.startAt || undefined,
        endAt: editData.endAt || undefined,
      }),
    }).finally(() => setBusy(false));
    setEditId(null);
    setEditData({});
    load();
  }

  async function toggleEnabled(id: string, current: boolean) {
    await fetch(`/api/admin/announcement/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !current }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("確定刪除這則公告？")) return;
    await fetch(`/api/admin/announcement/${id}`, { method: "DELETE" });
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="admin-wrap">
      <div className="admin-title">內容管理・公告欄</div>

      <div className="admin-grid">
        {/* 新增區 */}
        <section className="card">
          <h2>新增公告</h2>

          <div className="form-row-1">
            <input className="input" placeholder="公告標題" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea className="textarea" placeholder="公告內容" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>

          <div className="form-row" style={{ marginTop: 10 }}>
            <div>
              <label className="help">開始時間（選填）</label>
              <input type="datetime-local" className="input" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>
            <div>
              <label className="help">結束時間（選填）</label>
              <input type="datetime-local" className="input" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center" }}>
            <label className="switch" title="啟用 / 停用">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              <span className="pill"><span className="dot" /></span>
              <span>{enabled ? "啟用" : "停用"}</span>
            </label>

            <button className="btn" onClick={create} disabled={busy}>新增公告</button>
            <button className="btn ghost" onClick={() => { setTitle(""); setBody(""); setEnabled(true); setStartAt(""); setEndAt(""); }}>清空</button>
          </div>
        </section>

        {/* 列表區 */}
        <section className="card">
          <h2>公告列表</h2>
          <table className="table">
            <thead>
              <tr>
                <th>標題 / 內容</th>
                <th style={{ width: 160 }}>時段</th>
                <th style={{ width: 180 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{a.title}</div>
                    <div style={{ opacity: .85, whiteSpace: "pre-wrap" }}>{a.body}</div>
                  </td>
                  <td>
                    <div className="help">
                      {a.startAt ? new Date(a.startAt).toLocaleString() : "—"} ~<br />
                      {a.endAt ? new Date(a.endAt).toLocaleString() : "—"}
                    </div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn muted" onClick={() => toggleEnabled(a.id, a.enabled)}>
                        {a.enabled ? "停用" : "啟用"}
                      </button>
                      <button className="btn ghost" onClick={() => openEdit(a)}>編輯</button>
                      <button className="btn warn" onClick={() => remove(a.id)}>刪除</button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={3} className="help">目前沒有公告，先在左側新增一筆吧。</td></tr>}
            </tbody>
          </table>
        </section>
      </div>

      {/* 編輯面板（簡易 inline） */}
      {editId && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>編輯公告</h2>
          <div className="form-row-1">
            <input className="input" value={editData.title ?? ""} onChange={(e) => setEditData(s => ({ ...s, title: e.target.value }))} />
            <textarea className="textarea" value={editData.body ?? ""} onChange={(e) => setEditData(s => ({ ...s, body: e.target.value }))} />
          </div>
          <div className="form-row" style={{ marginTop: 10 }}>
            <div>
              <label className="help">開始時間</label>
              <input type="datetime-local" className="input"
                value={editData.startAt ? editData.startAt.slice(0,16) : ""}
                onChange={(e) => setEditData(s => ({ ...s, startAt: e.target.value || null }))} />
            </div>
            <div>
              <label className="help">結束時間</label>
              <input type="datetime-local" className="input"
                value={editData.endAt ? editData.endAt.slice(0,16) : ""}
                onChange={(e) => setEditData(s => ({ ...s, endAt: e.target.value || null }))} />
            </div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center" }}>
            <label className="switch">
              <input type="checkbox" checked={!!editData.enabled} onChange={(e) => setEditData(s => ({ ...s, enabled: e.target.checked }))} />
              <span className="pill"><span className="dot" /></span>
              <span>{editData.enabled ? "啟用" : "停用"}</span>
            </label>
            <button className="btn" onClick={saveEdit} disabled={busy}>儲存變更</button>
            <button className="btn ghost" onClick={() => { setEditId(null); setEditData({}); }}>取消</button>
          </div>
        </section>
      )}
    </div>
  );
}
