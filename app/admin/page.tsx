// app/admin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type UserRow = {
  id: string;
  email: string;
  name?: string | null;
  balance: number;
  bankBalance: number;
  isAdmin: boolean;
  createdAt: string;
};

type LedgerRow = {
  id: string;
  userId: string;
  type: string;
  delta?: number;           // 若你的 API 回傳 delta
  amount?: number;          // 或者 amount（二者擇一，面板會自動判斷）
  memo?: string | null;     // 或 note
  note?: string | null;
  balanceAfter?: number;
  bankAfter?: number;
  createdAt: string;
  user?: { email: string } | null;
};

const TABS = ["發幣/扣幣", "會員", "交易", "房間控制", "公告欄", "跑馬燈"] as const;
type Tab = (typeof TABS)[number];

// 小工具
async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit & { parseAs?: "json" | "text" }
): Promise<T> {
  const res = await fetch(input, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const as = init?.parseAs ?? "json";
  const body = as === "json" ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (as === "json" && (body as any)?.error) || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return body as T;
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("發幣/扣幣");

  return (
    <div className="min-h-screen bg-casino-bg text-white">
      <TopBar />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl border transition ${
                tab === t
                  ? "border-white/60 bg-white/10"
                  : "border-white/20 hover:border-white/40"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Panels */}
        <div className="glass glow-ring rounded-2xl p-6">
          {tab === "發幣/扣幣" && <WalletAdjustPanel />}
          {tab === "會員" && <UsersPanel />}
          {tab === "交易" && <LedgerPanel />}
          {tab === "房間控制" && <RoomsPanel />}

          {/* 新增的兩個面板 */}
          {tab === "公告欄" && <AnnouncementPanel />}
          {tab === "跑馬燈" && <MarqueePanel />}
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div className="bg-black/20 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="text-xl font-bold">管理後台</div>
        <div className="flex items-center gap-2">
          <Link href="/lobby" className="btn glass tilt">← 回大廳</Link>
        </div>
      </div>
    </div>
  );
}

/* =========================
   1) 發幣 / 扣幣
   ========================= */
function WalletAdjustPanel() {
  const [userId, setUserId] = useState("");
  const [emailForLookup, setEmailForLookup] = useState("");
  const [amount, setAmount] = useState<number>(100);
  const [target, setTarget] = useState<"WALLET" | "BANK">("WALLET");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function lookupUserByEmail() {
    setMsg("");
    try {
      const res = await fetchJson<{ users: UserRow[] }>(
        `/api/admin/users?q=${encodeURIComponent(emailForLookup)}`
      );
      if (res.users?.length) {
        setUserId(res.users[0].id);
        setMsg(`已選擇：${res.users[0].email}`);
      } else {
        setMsg("查無此使用者");
      }
    } catch (e: any) {
      setMsg(e.message || "查詢失敗");
    }
  }

  async function submit() {
    if (!userId || !Number.isFinite(amount)) {
      setMsg("請輸入 userId 與正確金額");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      await fetchJson(
        "/api/admin/wallet/adjust",
        {
          method: "POST",
          body: JSON.stringify({ userId, amount, target, memo }),
        }
      );
      setMsg("✅ 調整成功");
    } catch (e: any) {
      setMsg(`❌ ${e.message || "失敗"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="text-lg font-semibold mb-4">發幣 / 扣幣</div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm opacity-80">以 Email 快速選擇</label>
          <div className="flex gap-2 mt-1">
            <input
              value={emailForLookup}
              onChange={(e) => setEmailForLookup(e.target.value)}
              placeholder="someone@example.com"
              className="w-full bg-transparent border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
            />
            <button onClick={lookupUserByEmail} className="btn">查</button>
          </div>
        </div>

        <div>
          <label className="block text-sm opacity-80">使用者 ID（可直接貼上）</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="userId"
            className="w-full bg-transparent border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
          />
        </div>

        <div>
          <label className="block text-sm opacity-80">金額（可正可負）</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value || 0)))}
            className="w-full bg-transparent border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
          />
        </div>

        <div>
          <label className="block text-sm opacity-80">調整帳戶</label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as any)}
            className="w-full bg-transparent border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
          >
            <option value="WALLET">WALLET（錢包）</option>
            <option value="BANK">BANK（銀行）</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm opacity-80">備註</label>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="管理員調整說明（選填）"
            className="w-full bg-transparent border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={submit} disabled={loading} className="btn">
          {loading ? "處理中…" : "送出"}
        </button>
        {msg && <span className="text-sm opacity-80">{msg}</span>}
      </div>
    </div>
  );
}

/* =========================
   2) 會員管理（查詢/新增/刪除）
   ========================= */
function UsersPanel() {
  const [q, setQ] = useState("");
  const [list, setList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetchJson<{ users: UserRow[] }>(
        `/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`
      );
      setList(res.users || []);
    } catch (e: any) {
      setMsg(`❌ ${e.message || "讀取失敗"}`);
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    setMsg("");
    try {
      await fetchJson("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          isAdmin: newIsAdmin,
        }),
      });
      setMsg("✅ 新增成功");
      setNewEmail(""); setNewPassword(""); setNewIsAdmin(false);
      await load();
    } catch (e: any) {
      setMsg(`❌ ${e.message || "新增失敗"}`);
    }
  }

  async function removeUser(id: string) {
    if (!confirm("確認刪除此使用者？")) return;
    setMsg("");
    try {
      await fetchJson(`/api/admin/users/${id}`, { method: "DELETE" });
      setMsg("🗑️ 已刪除");
      setList((rows) => rows.filter((r) => r.id !== id));
    } catch (e: any) {
      setMsg(`❌ ${e.message || "刪除失敗"}`);
    }
  }

  useEffect(() => { load(); }, []); // 初次載入

  return (
    <div>
      <div className="text-lg font-semibold mb-4">會員管理</div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-sm opacity-80">搜尋（email / name）</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="關鍵字"
            className="bg-transparent border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
          />
        </div>
        <button onClick={load} className="btn">查詢</button>
        {loading && <span className="text-sm opacity-70">讀取中…</span>}
        {msg && <span className="text-sm opacity-80">{msg}</span>}
      </div>

      <div className="mt-6">
        <div className="opacity-80 text-sm mb-2">新增使用者</div>
        <div className="grid md:grid-cols-4 gap-2">
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email"
            className="bg-transparent border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="password"
            className="bg-transparent border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
          />
          <label className="flex items-center gap-2 text-sm opacity-90">
            <input
              type="checkbox"
              checked={newIsAdmin}
              onChange={(e) => setNewIsAdmin(e.target.checked)}
            />
            設為管理員
          </label>
          <button onClick={createUser} className="btn">建立</button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="opacity-70">
            <tr>
              <th className="text-left py-2 pr-3">Email</th>
              <th className="text-left py-2 pr-3">Name</th>
              <th className="text-right py-2 pr-3">Wallet</th>
              <th className="text-right py-2 pr-3">Bank</th>
              <th className="text-left py-2 pr-3">Admin</th>
              <th className="text-left py-2 pr-3">Created</th>
              <th className="text-right py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-t border-white/10">
                <td className="py-2 pr-3">{u.email}</td>
                <td className="py-2 pr-3">{u.name || "-"}</td>
                <td className="py-2 pr-3 text-right">{u.balance}</td>
                <td className="py-2 pr-3 text-right">{u.bankBalance}</td>
                <td className="py-2 pr-3">{u.isAdmin ? "✔" : ""}</td>
                <td className="py-2 pr-3">{new Date(u.createdAt).toLocaleString()}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => removeUser(u.id)}
                    className="px-3 py-1 rounded border border-red-400/50 hover:bg-red-500/10 transition"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center opacity-70">無資料</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================
   3) 交易紀錄
   ========================= */
function LedgerPanel() {
  const [userId, setUserId] = useState("");
  const [limit, setLimit] = useState(50);
  const [list, setList] = useState<LedgerRow[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const qs = new URLSearchParams();
      if (userId) qs.set("userId", userId);
      if (limit) qs.set("limit", String(limit));
      const res = await fetchJson<{ items: LedgerRow[]; nextCursor?: string }>(
        `/api/admin/ledger?${qs.toString()}`
      );
      setList(res.items || []);
    } catch (e: any) {
      setMsg(`❌ ${e.message || "讀取失敗"}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="text-lg font-semibold mb-4">交易紀錄</div>

      <div className="grid md:grid-cols-4 gap-2 items-end">
        <div className="md:col-span-2">
          <label className="block text-sm opacity-80">User ID（選填）</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="指定使用者"
            className="w-full bg-transparent border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
          />
        </div>
        <div>
          <label className="block text-sm opacity-80">每頁</label>
          <input
            type="number"
            min={10}
            value={limit}
            onChange={(e) => setLimit(Math.max(10, Number(e.target.value || 10)))}
            className="w-full bg-transparent border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn">查詢</button>
          {loading && <span className="text-sm opacity-70">讀取中…</span>}
          {msg && <span className="text-sm opacity-80">{msg}</span>}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="opacity-70">
            <tr>
              <th className="text-left py-2 pr-3">時間</th>
              <th className="text-left py-2 pr-3">使用者</th>
              <th className="text-left py-2 pr-3">類型</th>
              <th className="text-right py-2 pr-3">金額</th>
              <th className="text-left py-2 pr-3">備註</th>
              <th className="text-right py-2 pr-3">Wallet</th>
              <th className="text-right py-2 pr-3">Bank</th>
            </tr>
          </thead>
          <tbody>
            {list.map((g) => {
              const amt = (typeof g.delta === "number" ? g.delta : g.amount) ?? 0;
              const memo = (g.memo ?? g.note) || "";
              return (
                <tr key={g.id} className="border-t border-white/10">
                  <td className="py-2 pr-3">{new Date(g.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-3">{g.user?.email || g.userId}</td>
                  <td className="py-2 pr-3">{g.type}</td>
                  <td className={`py-2 pr-3 text-right ${amt >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {amt}
                  </td>
                  <td className="py-2 pr-3">{memo}</td>
                  <td className="py-2 pr-3 text-right">{g.balanceAfter ?? "-"}</td>
                  <td className="py-2 pr-3 text-right">{g.bankAfter ?? "-"}</td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text中心 opacity-70">無資料</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================
   4) 房間控制（強制下一局）
   ========================= */
function RoomsPanel() {
  const [room, setRoom] = useState<"R30" | "R60" | "R90">("R60");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function restart() {
    setLoading(true);
    setMsg("");
    try {
      // 你後端的 state 端點支援 force=restart（需管理員）
      await fetchJson(
        `/api/casino/baccarat/state?room=${room}&force=restart`,
        { parseAs: "json" }
      );
      setMsg("✅ 已強制切換新局（RESTART）");
    } catch (e: any) {
      setMsg(`❌ ${e.message || "失敗"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="text-lg font-semibold mb-4">房間控制</div>
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-sm opacity-80">房間 RoomCode</label>
          <select
            value={room}
            onChange={(e) => setRoom(e.target.value as any)}
            className="bg-transparent border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
          >
            <option value="R30">R30</option>
            <option value="R60">R60</option>
            <option value="R90">R90</option>
          </select>
        </div>
        <button onClick={restart} disabled={loading} className="btn">
          {loading ? "處理中…" : "強制下一局"}
        </button>
        {msg && <span className="text-sm opacity-80">{msg}</span>}
      </div>
      <div className="opacity-70 text-xs mt-3">
        * 此操作會把當日該房未結算的局標記為已結算並產生下一局。
      </div>
    </div>
  );
}

/* =========================
   5) 公告欄
   ========================= */
function AnnouncementPanel() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    setMsg("");
    try {
      const res = await fetchJson<{ items: any[] }>("/api/admin/announcements", { method: "GET" });
      setList(Array.isArray(res?.items) ? res.items : []);
    } catch (e: any) {
      setMsg(`❌ ${e.message || "讀取失敗"}`);
      setList([]);
    }
  }

  async function add() {
    if (!title || !content) { setMsg("請輸入標題與內容"); return; }
    setMsg("");
    try {
      await fetchJson("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ title, content, enabled: true }),
      });
      setTitle(""); setContent("");
      await load();
      setMsg("✅ 已新增");
    } catch (e: any) { setMsg(`❌ ${e.message || "新增失敗"}`); }
  }

  async function toggle(id: string, enabled: boolean) {
    setMsg("");
    try {
      await fetchJson(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
      await load();
      setMsg("✅ 已更新");
    } catch (e: any) { setMsg(`❌ ${e.message || "更新失敗"}`); }
  }

  async function removeItem(id: string) {
    if (!confirm("確定刪除此公告？")) return;
    setMsg("");
    try {
      await fetchJson(`/api/admin/announcements/${id}`, { method: "DELETE" });
      setList((xs) => xs.filter((x) => x.id !== id));
      setMsg("🗑️ 已刪除");
    } catch (e: any) { setMsg(`❌ ${e.message || "刪除失敗"}`); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="text-lg font-semibold mb-4">公告欄</div>
      <div className="grid md:grid-cols-3 gap-2">
        <input
          value={title} onChange={(e)=>setTitle(e.target.value)}
          placeholder="公告標題"
          className="bg-transparent border border白/20 rounded px-3 py-2 outline-none focus:border-white/40 md:col-span-1"
        />
        <input
          value={content} onChange={(e)=>setContent(e.target.value)}
          placeholder="公告內容"
          className="bg-transparent border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40 md:col-span-2"
        />
        <button onClick={add} className="btn md:col-span-3">發布公告</button>
      </div>

      {msg && <div className="mt-3 text-sm opacity-80">{msg}</div>}

      <div className="mt-6 divide-y divide-white/10">
        {list.map((a) => (
          <div key={a.id} className="py-3 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold">
                {a.title} {a.enabled ? "" : <span className="text-rose-300">(停用)</span>}
              </div>
              <div className="text-sm opacity-90">{a.content}</div>
              <div className="text-xs opacity-60 mt-1">{new Date(a.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button className="px-3 py-1 rounded border" onClick={()=>toggle(a.id, !a.enabled)}>
                {a.enabled ? "停用" : "啟用"}
              </button>
              <button className="px-3 py-1 rounded border border-red-500 text-red-400" onClick={()=>removeItem(a.id)}>
                刪除
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="py-6 text-center opacity-70">尚無公告</div>}
      </div>
    </div>
  );
}

/* =========================
   6) 跑馬燈
   ========================= */
function MarqueePanel() {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<number>(0);
  const [list, setList] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    setMsg("");
    try {
      const res = await fetchJson<{ items: any[] }>("/api/admin/marquees", { method: "GET" });
      setList(Array.isArray(res?.items) ? res.items : []);
    } catch (e: any) {
      setMsg(`❌ ${e.message || "讀取失敗"}`);
      setList([]);
    }
  }

  async function add() {
    if (!text) { setMsg("請輸入內容"); return; }
    setMsg("");
    try {
      await fetchJson("/api/admin/marquees", {
        method: "POST",
        body: JSON.stringify({ text, priority, enabled: true }),
      });
      setText(""); setPriority(0);
      await load();
      setMsg("✅ 已新增");
    } catch (e: any) { setMsg(`❌ ${e.message || "新增失敗"}`); }
  }

  async function toggle(id: string, enabled: boolean) {
    setMsg("");
    try {
      await fetchJson(`/api/admin/marquees/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
      await load();
      setMsg("✅ 已更新");
    } catch (e: any) { setMsg(`❌ ${e.message || "更新失敗"}`); }
  }

  async function setPrio(id: string) {
    const v = prompt("設定優先度（0~999，越大越前面）", "0");
    if (v == null) return;
    const n = Math.max(0, Math.min(999, Number(v) || 0));
    setMsg("");
    try {
      await fetchJson(`/api/admin/marquees/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ priority: n }),
      });
      await load();
      setMsg("✅ 已更新優先度");
    } catch (e: any) { setMsg(`❌ ${e.message || "更新失敗"}`); }
  }

  async function removeItem(id: string) {
    if (!confirm("確定刪除此訊息？")) return;
    setMsg("");
    try {
      await fetchJson(`/api/admin/marquees/${id}`, { method: "DELETE" });
      setList((xs)=>xs.filter(x=>x.id!==id));
      setMsg("🗑️ 已刪除");
    } catch (e: any) { setMsg(`❌ ${e.message || "刪除失敗"}`); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="text-lg font-semibold mb-4">跑馬燈</div>
      <div className="grid md:grid-cols-3 gap-2">
        <input
          value={text} onChange={(e)=>setText(e.target.value)}
          placeholder="跑馬燈內容"
          className="bg-transparent border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40 md:col-span-2"
        />
        <input
          type="number" min={0} max={999}
          value={priority} onChange={(e)=>setPriority(Number(e.target.value||0))}
          placeholder="優先度（大在前）"
          className="bg-transparent border border-white/20 rounded px-3 py-2 outline-none focus:border-white/40"
        />
        <button onClick={add} className="btn md:col-span-3">新增跑馬燈</button>
      </div>

      {msg && <div className="mt-3 text-sm opacity-80">{msg}</div>}

      <div className="mt-6 divide-y divide-white/10">
        {list.map((m) => (
          <div key={m.id} className="py-3 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold">
                {m.text} {m.enabled ? "" : <span className="text-rose-300">(停用)</span>}
              </div>
              <div className="text-xs opacity-60 mt-1">優先度：{m.priority} ｜ {new Date(m.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button className="px-3 py-1 rounded border" onClick={()=>toggle(m.id, !m.enabled)}>
                {m.enabled ? "停用" : "啟用"}
              </button>
              <button className="px-3 py-1 rounded border" onClick={()=>setPrio(m.id)}>
                調整優先度
              </button>
              <button className="px-3 py-1 rounded border border-red-500 text-red-400" onClick={()=>removeItem(m.id)}>
                刪除
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="py-6 text-center opacity-70">尚無跑馬燈</div>}
      </div>
    </div>
  );
}
