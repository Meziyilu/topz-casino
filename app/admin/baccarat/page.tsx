"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type RoomCode = "R30" | "R60" | "R90";

export default function AdminBaccaratPage() {
  const [room, setRoom] = useState<RoomCode>("R30");
  const [seconds, setSeconds] = useState<number>(30);
  const [token, setToken] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string>("尚未操作");
  const [autoOn, setAutoOn] = useState(false);
  const autoTimer = useRef<any>(null);

  // 讀取/儲存 token
  useEffect(() => {
    const t = localStorage.getItem("ADMIN_TOKEN") || "";
    setToken(t);
  }, []);
  useEffect(() => {
    localStorage.setItem("ADMIN_TOKEN", token || "");
  }, [token]);

  async function call(path: string, method = "POST", qs?: Record<string, any>) {
    const u = new URL(path, location.origin);
    if (qs) Object.entries(qs).forEach(([k, v]) => u.searchParams.set(k, String(v)));
    const res = await fetch(u.toString(), { method, headers: { "x-admin-token": token || "" } });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json };
  }

  async function startNow() {
    setBusy(true);
    try {
      const r = await call("/api/casino/baccarat/admin/start", "POST", { room, seconds });
      setLog(`START → ${JSON.stringify(r.json)}`);
    } finally { setBusy(false); }
  }

  async function tickOnce() {
    setBusy(true);
    try {
      const r = await call("/api/casino/baccarat/admin/auto", "POST", { room });
      setLog(`AUTO → ${JSON.stringify(r.json)}`);
    } finally { setBusy(false); }
  }

  function toggleAuto() {
    if (autoOn) {
      clearInterval(autoTimer.current);
      autoTimer.current = null;
      setAutoOn(false);
      setLog("已停止本頁自動輪轉");
    } else {
      autoTimer.current = setInterval(() => {
        call("/api/casino/baccarat/admin/auto", "POST", { room })
          .then((r) => setLog((s) => `AUTO(${room}) → ${JSON.stringify(r.json)}\n` + s))
          .catch((e) => setLog((s) => `AUTO error: ${e?.message || e}\n` + s));
      }, 5000); // 每 5 秒
      setAutoOn(true);
      setLog("已啟用本頁自動輪轉（視窗開著時有效）");
    }
  }

  async function settleNow(which: "PLAYER" | "BANKER" | "TIE") {
    setBusy(true);
    try {
      const r = await call("/api/casino/baccarat/admin/settle", "POST", { room, outcome: which });
      setLog(`SETTLE → ${JSON.stringify(r.json)}`);
    } finally { setBusy(false); }
  }

  useEffect(() => () => { if (autoTimer.current) clearInterval(autoTimer.current); }, []);

  return (
    <main className="admin-wrap admin-bk stack">
      <div className="panel stack">
        <div className="h1">百家樂管理</div>

        <div className="row">
          <label>房間</label>
          <select className="input" value={room} onChange={(e) => setRoom(e.target.value as RoomCode)}>
            <option value="R30">R30</option>
            <option value="R60">R60</option>
            <option value="R90">R90</option>
          </select>

          <label>每局秒數</label>
          <input className="input" type="number" min={10} value={seconds} onChange={(e) => setSeconds(Math.max(10, Number(e.target.value||0)))} />

          <label>ADMIN_TOKEN</label>
          <input className="input" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="輸入後會存 localStorage" style={{minWidth:260}} />
        </div>

        <div className="row">
          <button className="btn" onClick={startNow} disabled={busy}>立即開局</button>
          <button className="btn warn" onClick={tickOnce} disabled={busy}>執行一次 Auto</button>
          <button className="btn good" onClick={toggleAuto} disabled={busy}>{autoOn ? "停止本頁自動" : "啟用本頁自動 (5s)"}</button>
          <span className="muted">（正式請用 Cron 打 /admin/auto）</span>
        </div>

        <div className="row">
          <button className="btn bad" onClick={() => settleNow("PLAYER")} disabled={busy}>強制結算：閒</button>
          <button className="btn bad" onClick={() => settleNow("BANKER")} disabled={busy}>強制結算：莊</button>
          <button className="btn bad" onClick={() => settleNow("TIE")} disabled={busy}>強制結算：和</button>
        </div>
      </div>

      <div className="panel stack">
        <div className="h1">操作結果</div>
        <div className="status" style={{whiteSpace:"pre-wrap"}}>{log}</div>
        <div className="muted">前端玩家頁每秒會拉 /api/casino/baccarat/state，這裡輪轉後，玩家端就會看到倒數/開牌/結算與下一把。</div>
      </div>

      {/* 可選，如果你想分開的樣式 */}
      <link rel="stylesheet" href="/style/admin-baccarat.css" />
    </main>
  );
}
