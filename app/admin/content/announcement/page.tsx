"use client";

import { useEffect, useState } from "react";
import "@/../public/styles/admin-content.css";

type Announcement = {
  id: string;
  title: string;
  body: string;
  enabled: boolean;
  createdAt?: string;
};

export default function AdminAnnouncementPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);

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
      body: JSON.stringify({ title, body, enabled }),
    }).finally(() => setBusy(false));
    setTitle(""); setBody(""); setEnabled(true);
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
            <input className="input" placeholder="公告標題"
                   value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea className="textarea" placeholder="公告內容"
                      value={body} onChange={(e) => setBody(e.target.value)} />
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center" }}>
            <label className="switch" title="啟用 / 停用">
              <input type="checkbox" checked={enabled}
                     onChange={(e) => setEnabled(e.target.checked)} />
              <span className="pill"><span className="dot" /></span>
              <span>{enabled ? "啟用" : "停用"}</span>
            </label>
            <button className="btn" onClick={create} disabled={busy}>新增公告</button>
            <button className="btn ghost" onClick={() => { setTitle(""); setBody(""); setEnabled(true); }}>清空</button>
          </div>
        </section>

        {/* 列表區 */}
        <section className="card">
          <h2>公告列表</h2>
          <table className="table">
            <thead>
              <tr>
                <th>標題 / 內容</th>
                <th style={{ width: 110 }}>狀態</th>
                <th style={{ width: 160 }}>操作</th>
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
                    <span className={a.enabled ? "badge ok" : "badge off"}>
                      {a.enabled ? "啟用" : "停用"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn muted" onClick={() => toggleEnabled(a.id, a.enabled)}>
                        {a.enabled ? "停用" : "啟用"}
                      </button>
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
    </div>
  );
}
