"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/* ================= Types (與前端 room 頁一致的最小需求) ================= */
type Outcome = "PLAYER" | "BANKER" | "TIE";
type Phase = "BETTING" | "REVEALING" | "SETTLED";
type RoomCode = "R30" | "R60" | "R90";

type StateResp = {
  ok: boolean;
  room: { code: RoomCode; name: string; durationSeconds: number };
  day: string;                              // YYYY-MM-DD
  roundId: string | null;
  roundSeq: number;                         // 若你暫時沒有，就可能是 0
  phase: Phase;
  secLeft: number;                          // BETTING 倒數
  result: null | { outcome: Outcome; p: number; b: number };
  cards?: { player: any[]; banker: any[] };
  myBets: Record<string, number>;           // admin 這邊不一定會用到
  balance: number | null;                   // admin 不用
  recent: { roundSeq: number; outcome: Outcome; p: number; b: number }[];
};

type LogItem = { ts: string; msg: string; kind?: "ok" | "err" | "info" };

/* ================= Helpers ================= */
const ro = (v: any) => (typeof v === "object" ? JSON.stringify(v) : String(v));
const pad4 = (n: number) => String(Math.max(0, n || 0)).padStart(4, "0");

/* ================= Page ================= */
export default function BaccaratAdminPage() {
  const search = useSearchParams();
  const router = useRouter();

  // 房間（用 ?room=R30|R60|R90 記住）
  const initialRoom = ((search.get("room") || "R60").toUpperCase() as RoomCode);
  const [room, setRoom] = useState<RoomCode>(initialRoom);

  // 本地控制：下注期秒數、揭示秒數、自動輪播開關
  const [bettingSeconds, setBettingSeconds] = useState<number>(Number(search.get("bet") || 60));
  const [revealSeconds, setRevealSeconds]   = useState<number>(Number(search.get("reveal") || 5));
  const [autoOn, setAutoOn] = useState(false);

  // 狀態輪詢
  const [state, setState] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 日誌
  const [logs, setLogs] = useState<LogItem[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const log = useCallback((msg: string, kind: LogItem["kind"] = "info") => {
    setLogs((lst) => [...lst, { ts: new Date().toLocaleTimeString(), msg, kind }].slice(-200));
  }, []);
  useEffect(() => { logRef.current?.scrollTo({ top: 999999, behavior: "smooth" }); }, [logs]);

  // 在網址上同步 room/bet/reveal（方便重整仍保留設定）
  useEffect(() => {
    const sp = new URLSearchParams(search?.toString() || "");
    sp.set("room", room);
    sp.set("bet", String(bettingSeconds));
    sp.set("reveal", String(revealSeconds));
    router.replace(`/admin/baccarat?${sp.toString()}`);
  }, [room, bettingSeconds, revealSeconds]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 取得狀態 */
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/casino/baccarat/state?room=${room}`, { cache: "no-store", credentials: "include" });
      const json = (await res.json()) as StateResp;
      if (!res.ok) throw new Error((json as any)?.error || "LOAD_FAIL");
      setState(json);
      setErr("");
      return json;
    } catch (e: any) {
      setErr(e?.message || "LOAD_FAIL");
      log(`❌ 狀態讀取失敗：${e?.message || e}`, "err");
      return null;
    }
  }, [room, log]);

  // 輪詢狀態
  useEffect(() => {
    let alive = true;
    (async () => {
      const first = await fetchState();
      if (!alive) return;
      if (!first) return;
    })();
    const t = setInterval(fetchState, 1000);
    return () => { alive = false; clearInterval(t); };
  }, [fetchState]);

  /* 控制 API 包裝 */
  async function post(url: string, label: string) {
    try {
      setLoading(true);
      const res = await fetch(url, { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `${label}_FAIL`);
      log(`✅ ${label} 成功`);
      return json;
    } catch (e: any) {
      log(`❌ ${label} 失敗：${e?.message || e}`, "err");
      throw e;
    } finally {
      setLoading(false);
      fetchState();
    }
  }

  /* ========== 單局控制 ========== */
  const startRound = useCallback(async () => {
    await post(`/api/casino/baccarat/admin/start?room=${room}&seconds=${bettingSeconds}`, "開始下注");
  }, [room, bettingSeconds]);

  const revealNow = useCallback(async () => {
    // 如果你暫時沒有 /reveal API，可先不使用這顆鈕
    await post(`/api/casino/baccarat/admin/reveal?room=${room}`, "強制進入揭示");
  }, [room]);

  const settleNow = useCallback(async () => {
    await post(`/api/casino/baccarat/admin/settle?room=${room}`, "立即結算");
  }, [room]);

  const resetRound = useCallback(async () => {
    await post(`/api/casino/baccarat/admin/reset?room=${room}`, "重置本局（退款）");
  }, [room]);

  /* ========== 自動輪播 ========== */
  const autoRef = useRef({ stop: true });
  const tickerRef = useRef<NodeJS.Timeout | null>(null);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startAuto = useCallback(async () => {
    if (autoOn) return;
    autoRef.current.stop = false;
    setAutoOn(true);
    log(`🔁 已啟用【自動輪播】（房間：${room}，${bettingSeconds}s，揭示 ${revealSeconds}s）`, "ok");

    // 主 loop：每秒檢查狀態並採取行動
    const loop = async () => {
      if (autoRef.current.stop) return;

      const s = state || (await fetchState());
      const phase: Phase = (s?.phase ?? "SETTLED");

      // 下注期：確保有開局；若時間快到，準備排程進入揭示
      if (phase === "BETTING") {
        // 安排揭示定時器（如果還沒安排）
        if (!revealTimerRef.current) {
          const ms = Math.max(0, (s?.secLeft ?? 0) * 1000);
          revealTimerRef.current = setTimeout(async () => {
            revealTimerRef.current = null;
            // 嘗試 reveal -> 等待 revealSeconds -> settle
            try {
              await post(`/api/casino/baccarat/admin/reveal?room=${room}`, "自動：進入揭示");
            } catch {/* 忽略失敗，loop 會再處理 */}
            // 等揭示秒數
            if (revealSeconds > 0) {
              await new Promise((r) => setTimeout(r, revealSeconds * 1000));
            }
            try {
              await post(`/api/casino/baccarat/admin/settle?room=${room}`, "自動：結算");
            } catch {/* 忽略，loop 繼續 */}
          }, ms);
        }
      }

      // 已結算：立即開下一局（防止卡住）
      if (phase === "SETTLED") {
        // 清除任何揭示計時器
        if (revealTimerRef.current) { clearTimeout(revealTimerRef.current); revealTimerRef.current = null; }
        try {
          await post(`/api/casino/baccarat/admin/start?room=${room}&seconds=${bettingSeconds}`, "自動：開新局");
        } catch {/* 忽略 */}
      }
    };

    // 立即跑一次，之後每 1s 跑一次
    await loop();
    tickerRef.current = setInterval(() => { loop(); }, 1000);
  }, [autoOn, room, bettingSeconds, revealSeconds, state, fetchState, post, log]);

  const stopAuto = useCallback(() => {
    autoRef.current.stop = true;
    setAutoOn(false);
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
    if (revealTimerRef.current) { clearTimeout(revealTimerRef.current); revealTimerRef.current = null; }
    log("⏹️ 已停止【自動輪播】", "info");
  }, [log]);

  // 切房時把自動關掉（避免跨房衝突）
  useEffect(() => {
    if (autoOn) stopAuto();
  }, [room]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ========== 顯示用 ========== */
  const phaseLabel = useMemo(() => {
    switch (state?.phase) {
      case "BETTING": return "下注中";
      case "REVEALING": return "開牌中";
      case "SETTLED": return "已結算";
      default: return "—";
    }
  }, [state?.phase]);

  /* ================= Render ================= */
  return (
    <main className="bk-admin-wrap">
      <header className="bk-admin-header">
        <h1>百家樂｜管理面板</h1>
        <div className="row">
          <div className="field">
            <label>房間</label>
            <select value={room} onChange={(e) => setRoom(e.target.value as RoomCode)}>
              <option value="R30">R30（30秒）</option>
              <option value="R60">R60（60秒）</option>
              <option value="R90">R90（90秒）</option>
            </select>
          </div>
          <div className="field">
            <label>下注秒數</label>
            <input type="number" min={5} max={600} value={bettingSeconds}
                   onChange={(e) => setBettingSeconds(Math.max(5, Number(e.target.value || 0)))} />
          </div>
          <div className="field">
            <label>揭示秒數（動畫）</label>
            <input type="number" min={0} max={30} value={revealSeconds}
                   onChange={(e) => setRevealSeconds(Math.max(0, Number(e.target.value || 0)))} />
          </div>
        </div>

        <div className="actions">
          <button onClick={startRound} disabled={loading}>開始（單局）</button>
          <button onClick={revealNow} disabled={loading}>強制開牌</button>
          <button onClick={settleNow} disabled={loading} className="warn">立即結算</button>
          <button onClick={resetRound} disabled={loading} className="danger">重置本局（退款）</button>
        </div>

        <div className="actions">
          {!autoOn ? (
            <button onClick={startAuto} disabled={loading} className="primary">啟用【自動輪播】</button>
          ) : (
            <button onClick={stopAuto} disabled={loading} className="secondary">停止【自動輪播】</button>
          )}
        </div>
      </header>

      <section className="bk-admin-status">
        <div className="card">
          <div className="title">目前狀態</div>
          <div className="grid">
            <div><b>房間</b><span>{state?.room?.name ?? room}</span></div>
            <div><b>局序</b><span>{pad4(state?.roundSeq ?? 0)}</span></div>
            <div><b>回合ID</b><span className="mono">{state?.roundId ?? "—"}</span></div>
            <div><b>階段</b><span>{phaseLabel}</span></div>
            <div><b>下注倒數</b><span>{state?.phase === "BETTING" ? `${state?.secLeft ?? 0}s` : "—"}</span></div>
            <div><b>結果</b><span>{state?.result ? `${state.result.outcome}（閒 ${state.result.p} / 莊 ${state.result.b}）` : "—"}</span></div>
          </div>
        </div>

        <div className="card">
          <div className="title">最近 10 局</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>局序</th><th>結果</th><th>閒</th><th>莊</th>
                </tr>
              </thead>
              <tbody>
                {(state?.recent || []).map((r, i) => (
                  <tr key={i}>
                    <td>{pad4(r.roundSeq)}</td>
                    <td>{r.outcome}</td>
                    <td>{r.p}</td>
                    <td>{r.b}</td>
                  </tr>
                ))}
                {(!state || state.recent.length === 0) && (
                  <tr><td colSpan={4} className="muted">暫無資料</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="title">事件日誌</div>
          <div className="log" ref={logRef}>
            {logs.map((l, i) => (
              <div key={i} className={`log-item ${l.kind || "info"}`}>
                <span className="ts">{l.ts}</span>
                <span className="msg">{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 掛管理面板樣式（你可以換成自己的檔名） */}
      <link rel="stylesheet" href="/styles/admin/baccarat-admin.css" />
    </main>
  );
}
