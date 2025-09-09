"use client";

import { Suspense } from "react";

// 這行避免被預產生（prerender）導致 useSearchParams 錯誤
export const dynamic = "force-dynamic";

// 外層只負責提供 Suspense 邊界
export default function Page() {
  return (
    <Suspense fallback={<div style={{padding:16}}>載入管理面板中…</div>}>
      <AdminBaccaratInner />
    </Suspense>
  );
}

/* ===== 內層元件才使用 useSearchParams / 其餘全部沿用 ===== */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Outcome = "PLAYER" | "BANKER" | "TIE";
type Phase = "BETTING" | "REVEALING" | "SETTLED";
type RoomCode = "R30" | "R60" | "R90";

type StateResp = {
  ok: boolean;
  room: { code: RoomCode; name: string; durationSeconds: number };
  day: string;
  roundId: string | null;
  roundSeq: number;
  phase: Phase;
  secLeft: number;
  result: null | { outcome: Outcome; p: number; b: number };
  cards?: { player: any[]; banker: any[] };
  myBets: Record<string, number>;
  balance: number | null;
  recent: { roundSeq: number; outcome: Outcome; p: number; b: number }[];
};

type LogItem = { ts: string; msg: string; kind?: "ok" | "err" | "info" };
const pad4 = (n: number) => String(Math.max(0, n || 0)).padStart(4, "0");

function AdminBaccaratInner() {
  const search = useSearchParams();
  const router = useRouter();

  const initialRoom = ((search.get("room") || "R60").toUpperCase() as RoomCode);
  const [room, setRoom] = useState<RoomCode>(initialRoom);

  const [bettingSeconds, setBettingSeconds] = useState<number>(Number(search.get("bet") || 60));
  const [revealSeconds, setRevealSeconds]   = useState<number>(Number(search.get("reveal") || 5));
  const [autoOn, setAutoOn] = useState(false);

  const [state, setState] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [logs, setLogs] = useState<LogItem[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const log = useCallback((msg: string, kind: LogItem["kind"] = "info") => {
    setLogs((lst) => [...lst, { ts: new Date().toLocaleTimeString(), msg, kind }].slice(-200));
  }, []);
  useEffect(() => { logRef.current?.scrollTo({ top: 1e6, behavior: "smooth" }); }, [logs]);

  // 將 room/bet/reveal 同步到 URL（放在 effect，避免 render 期更動）
  useEffect(() => {
    const sp = new URLSearchParams(search?.toString() || "");
    sp.set("room", room);
    sp.set("bet", String(bettingSeconds));
    sp.set("reveal", String(revealSeconds));
    router.replace(`/admin/baccarat?${sp.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, bettingSeconds, revealSeconds]);

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

  useEffect(() => {
    let alive = true;
    (async () => { await fetchState(); })();
    const t = setInterval(fetchState, 1000);
    return () => { alive = false; clearInterval(t); };
  }, [fetchState]);

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

  const startRound = useCallback(async () => {
    await post(`/api/casino/baccarat/admin/start?room=${room}&seconds=${bettingSeconds}`, "開始下注");
  }, [room, bettingSeconds]);

  const revealNow = useCallback(async () => {
    await post(`/api/casino/baccarat/admin/reveal?room=${room}`, "強制開牌");
  }, [room]);

  const settleNow = useCallback(async () => {
    await post(`/api/casino/baccarat/admin/settle?room=${room}`, "立即結算");
  }, [room]);

  const resetRound = useCallback(async () => {
    await post(`/api/casino/baccarat/admin/reset?room=${room}`, "重置本局（退款）");
  }, [room]);

  const autoRef = useRef({ stop: true });
  const tickerRef = useRef<NodeJS.Timeout | null>(null);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startAuto = useCallback(async () => {
    if (autoOn) return;
    autoRef.current.stop = false;
    setAutoOn(true);
    log(`🔁 已啟用【自動輪播】（房間：${room}，${bettingSeconds}s，揭示 ${revealSeconds}s）`, "ok");

    const loop = async () => {
      if (autoRef.current.stop) return;
      const s = state || (await fetchState());
      const phase: Phase = (s?.phase ?? "SETTLED");

      if (phase === "BETTING") {
        if (!revealTimerRef.current) {
          const ms = Math.max(0, (s?.secLeft ?? 0) * 1000);
          revealTimerRef.current = setTimeout(async () => {
            revealTimerRef.current = null;
            try { await post(`/api/casino/baccarat/admin/reveal?room=${room}`, "自動：進入揭示"); } catch {}
            if (revealSeconds > 0) await new Promise((r) => setTimeout(r, revealSeconds * 1000));
            try { await post(`/api/casino/baccarat/admin/settle?room=${room}`, "自動：結算"); } catch {}
          }, ms);
        }
      }

      if (phase === "SETTLED") {
        if (revealTimerRef.current) { clearTimeout(revealTimerRef.current); revealTimerRef.current = null; }
        try { await post(`/api/casino/baccarat/admin/start?room=${room}&seconds=${bettingSeconds}`, "自動：開新局"); } catch {}
      }
    };

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

  useEffect(() => { if (autoOn) stopAuto(); }, [room]); // 切房自動關閉

  const phaseLabel = useMemo(() => {
    switch (state?.phase) {
      case "BETTING": return "下注中";
      case "REVEALING": return "開牌中";
      case "SETTLED": return "已結算";
      default: return "—";
    }
  }, [state?.phase]);

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
                <tr><th>局序</th><th>結果</th><th>閒</th><th>莊</th></tr>
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

      <link rel="stylesheet" href="/styles/admin/baccarat-admin.css" />
    </main>
  );
}
