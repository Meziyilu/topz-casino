// app/admin/content/popup/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Popup = {
  id: string;
  code: string | null;
  title: string;
  body: string;
  startAt: string | null;
  endAt: string | null;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function PopupAdminPage() {
  const [list, setList] = useState<Popup[]>([]);
  const [q, setQ] = useState("");
  const [enabled, setEnabled] = useState<"" | "1" | "0">("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<Popup> & { id?: string }>({ enabled: true, priority: 100 });
  const isEditing = useMemo(() => !!editing?.id, [editing]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (enabled) params.set("enabled", enabled);
      params.set("limit", "100");
      const r = await fetch(`/api/admin/lobby-popups?${params.toString()}`, { cache: "no-store" });
      const d = await r.json();
      setList(d.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const resetForm = () => setEditing({ enabled: true, priority: 100 });

  const save = async () => {
    const payload = {
      code: editing.code ?? null,
      title: editing.title ?? "",
      body: editing.body ?? "",
      startAt: editing.startAt || null,
      endAt: editing.endAt || null,
      priority: Number(editing.priority ?? 100),
      enabled: !!editing.enabled,
    };
    if (!payload.title) return alert("請輸入標題");
    const url = isEditing ? `/api/admin/lobby-popups/${editing.id}` : `/api/admin/lobby-popups`;
    const method = isEditing ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    resetForm();
    await load();
  };

  const editRow = (p: Popup) => {
    setEditing({
      id: p.id,
      code: p.code ?? "",
      title: p.title,
      body: p.body,
      startAt: p.startAt ? p.startAt.slice(0, 16) : "",
      endAt: p.endAt ? p.endAt.slice(0, 16) : "",
      priority: p.priority,
      enabled: p.enabled,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const del = async (id: string) => {
    if (!confirm("確定刪除？")) return;
    await fetch(`/api/admin/lobby-popups/${id}`, { method: "DELETE" });
    if (editing.id === id) resetForm();
    await load();
  };

  return (
    <main className="container" style={{ maxWidth: 980, margin: "24px auto", padding: "0 16px" }}>
      <header className="admin-home-head glass" style={{ marginBottom: 12 }}>
        <h1>彈窗管理</h1>
        <p className="sub">設定大廳彈窗：優先度越高越先顯示；可設定時間區間與啟用。</p>
      </header>

      {/* 搜尋列 */}
      <section className="glass" style={{ padding: 12, borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            placeholder="關鍵字（標題/內文/代碼）"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <select value={enabled} onChange={(e) => setEnabled(e.target.value as any)}>
            <option value="">全部</option>
            <option value="1">啟用</option>
            <option value="0">停用</option>
          </select>
          <button className="lb-btn" onClick={load} disabled={loading}>
            {loading ? "查詢中…" : "查詢"}
          </button>
        </div>
      </section>

      {/* 編輯表單 */}
      <section className="glass" style={{ padding: 12, borderRadius: 12, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{isEditing ? "編輯彈窗" : "新增彈窗"}</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <input placeholder="代碼（唯一，可選）"
                 value={editing.code ?? ""} onChange={e=>setEditing(s=>({ ...s, code: e.target.value }))} />
          <input placeholder="標題"
                 value={editing.title ?? ""} onChange={e=>setEditing(s=>({ ...s, title: e.target.value }))} />
          <textarea placeholder="內文" rows={5}
                    value={editing.body ?? ""} onChange={e=>setEditing(s=>({ ...s, body: e.target.value }))} />
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <label>開始</label>
            <input type="datetime-local"
                   value={editing.startAt ?? ""} onChange={e=>setEditing(s=>({ ...s, startAt: e.target.value }))} />
            <label>結束</label>
            <input type="datetime-local"
                   value={editing.endAt ?? ""} onChange={e=>setEditing(s=>({ ...s, endAt: e.target.value }))} />
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
            <label>優先度</label>
            <input type="number" style={{ width: 120 }} value={editing.priority ?? 100}
                   onChange={e=>setEditing(s=>({ ...s, priority: Number(e.target.value) }))} />
            <label><input type="checkbox" checked={!!editing.enabled}
                          onChange={e=>setEditing(s=>({ ...s, enabled: e.target.checked }))} /> 啟用</label>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="lb-btn" onClick={save}>{isEditing ? "儲存變更" : "新增"}</button>
            {isEditing && <button className="lb-btn ghost" onClick={resetForm}>取消編輯</button>}
          </div>
        </div>
      </section>

      {/* 清單 */}
      <section className="glass" style={{ padding: 12, borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>清單（{list.length}）</h2>
        <ul className="lb-list soft">
          {list.map(p => (
            <li key={p.id}>
              <div style={{ display: "flex", justifyContent:"space-between", gap:12, alignItems:"baseline", flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{p.title} {p.enabled ? "" : <span className="lb-muted">(停用)</span>}</div>
                  <div className="lb-muted" style={{ fontSize: 12 }}>
                    優先度 {p.priority}　期間 {p.startAt ? p.startAt : "∞"} ~ {p.endAt ? p.endAt : "∞"}　{p.code ? `代碼 ${p.code}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="lb-btn-mini" onClick={()=>editRow(p)}>編輯</button>
                  <button className="lb-btn-mini ghost" onClick={()=>del(p.id)}>刪除</button>
                </div>
              </div>
              <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{p.body}</div>
            </li>
          ))}
          {list.length === 0 && <li className="lb-muted">目前沒有資料</li>}
        </ul>
      </section>

      <link rel="stylesheet" href="/styles/admin/admin-home.css" />
    </main>
  );
}
