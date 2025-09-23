"use client";

import { useEffect, useState } from "react";

type Msg = {
  id: string;
  text: string;
  priority: number;
  enabled: boolean;
  startAt?: string | null;
  endAt?: string | null;
  createdAt?: string;
};

async function safeJson(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text.slice(0,180)}`);
  }
  return res.json();
}

export default function AdminMarqueeView() {
  const [list, setList] = useState<Msg[]>([]);
  const [qEnabled, setQEnabled] = useState<"" | "1" | "0">("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    text: "",
    priority: 0,
    enabled: true,
    startAt: "",
    endAt: "",
  });

  async function load() {
    const url = `/api/admin/marquee?enabled=${qEnabled}`;
    const json = await safeJson(await fetch(url, { cache: "no-store" }));
    setList(json.items ?? []);
  }

  useEffect(() => { load().catch(console.error); }, [qEnabled]);

  async function submitNew(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: any = {
        text: form.text,
        priority: Number(form.priority) || 0,
        enabled: form.enabled,
        startAt: form.startAt || undefined,
        endAt: form.endAt || undefined,
      };
      await safeJson(await fetch("/api/admin/marquee", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      }));
      setForm({ text: "", priority: 0, enabled: true, startAt: "", endAt: "" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, enabled: boolean) {
    setBusy(true);
    try {
      await safeJson(await fetch(`/api/admin/marquee/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }),
      }));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("確定刪除？")) return;
    setBusy(true);
    try {
      await safeJson(await fetch(`/api/admin/marquee/${id}`, { method: "DELETE" }));
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <h1>跑馬燈管理</h1>

      <form onSubmit={submitNew} style={{ display: "grid", gap: 8, margin: "12px 0" }}>
        <input
          placeholder="文字內容"
          value={form.text}
          onChange={(e) => setForm((v) => ({ ...v, text: e.target.value }))}
          required
        />
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label>Priority：
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm((v) => ({ ...v, priority: Number(e.target.value) }))}
              style={{ width: 100 }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((v) => ({ ...v, enabled: e.target.checked }))}
            /> 啟用
          </label>
          <label>開始：<input type="datetime-local"
            value={form.startAt}
            onChange={(e) => setForm((v) => ({ ...v, startAt: e.target.value }))} /></label>
          <label>結束：<input type="datetime-local"
            value={form.endAt}
            onChange={(e) => setForm((v) => ({ ...v, endAt: e.target.value }))} /></label>
          <button disabled={busy} type="submit">{busy ? "處理中…" : "新增"}</button>
        </div>
      </form>

      <div style={{ margin: "10px 0" }}>
        篩選：
        <select value={qEnabled} onChange={(e) => setQEnabled(e.target.value as any)}>
          <option value="">全部</option>
          <option value="1">僅啟用</option>
          <option value="0">僅停用</option>
        </select>
      </div>

      <table border={1} cellPadding={6} width="100%">
        <thead>
          <tr>
            <th>狀態</th><th>優先度</th><th>內容</th><th>時間窗</th><th>建立</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          {list.map((it) => (
            <tr key={it.id}>
              <td>{it.enabled ? "啟用" : "停用"}</td>
              <td>{it.priority}</td>
              <td style={{ maxWidth: 480, wordWrap: "break-word" }}>{it.text}</td>
              <td>
                {(it.startAt ? new Date(it.startAt).toLocaleString() : "—")} ~{" "}
                {(it.endAt ? new Date(it.endAt).toLocaleString() : "—")}
              </td>
              <td>{it.createdAt ? new Date(it.createdAt).toLocaleString() : "—"}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button onClick={() => toggle(it.id, !it.enabled)} disabled={busy}>
                  {it.enabled ? "停用" : "啟用"}
                </button>{" "}
                <button onClick={() => remove(it.id)} disabled={busy}>刪除</button>
              </td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan={6}>尚無資料</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
