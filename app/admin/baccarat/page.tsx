// app/admin/baccarat/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RoomCode = "R30" | "R60" | "R90";
type Phase = "BETTING" | "REVEALING" | "SETTLED";
type Outcome = "PLAYER" | "BANKER" | "TIE";
type StateResp = {
  ok: boolean;
  room: { code: RoomCode; name: string; durationSeconds: number };
  day: string;
  roundId: string | null;
  roundSeq: number;
  phase: Phase;
  secLeft: number;
  result: null | { outcome: Outcome; p: number; b: number };
  balance: number | null;
};

const ROOM_SECONDS: Record<RoomCode, number> = { R30: 30, R60: 60, R90: 90 };
const REVEAL_SECONDS = 5; // 開牌動畫等待秒數（要配合 /admin/settle?reveal=）

export default function BaccaratAdminPage() {
  const [room, setRoom] = useState<RoomCode>("R60");
  const [state, setState] = useState<StateResp | null>(null);
  const stateRef = useRef<StateResp | null>(null); // 供自動輪播讀取最新狀態
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [autoRun, setAutoRun] = useState(false);

  const abortAutoRef = useRef<{ stop: boolean }>({ stop: false });

  const secs = useMemo(() => ROOM_SECONDS[room], [room]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const log = useCallback((s: string) => {
    setLogs((L) => [`${new Date().toLocaleTimeString()}  ${s}`, ...L].slice(0, 200));
    // eslint-disable-next-line no-console
    console.log("[ADMIN]", s);
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/casino/baccarat/state?room=${room}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "STATE_ERROR");
      setState(json as StateResp);
      setErr("");
    } catch (e: any) {
      setErr(e?.message || "STATE_FAIL");
    }
  }, [room]);

  useEffect(() => {
    fetchState();
    const t = setInterval(fetchState, 1000);
    return () => clearInterval(t);
  }, [fetchState]);

  async function startRound() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/casino/baccarat/admin/start?room=${room}&seconds=${secs}`,
        { method: "POST", credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "START_FAIL");
      log(`開始新局（${room}，${secs}s） roundId=${json.roundId}, roundSeq=${json.roundSeq}`);
      await fetchState();
    } catch (e: any) {
      log(`❌ 開始失敗：${e?.message}`);
      setErr(e?.message || "START_FAIL");
    } finally {
      setLoading(false);
    }
  }

  async function settleRound() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/casino/baccarat/admin/settle?room=${room}&reveal=${REVEAL_SECONDS}`,
        { method: "POST", credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "SETTLE_FAIL");
      log(`結算完成：${json.outcome}（P:${json.points?.p ?? "-"} / B:${json.points?.b ?? "-"})`);
      await fetchState();
    } catch (e: any) {
      log(`❌ 結算失敗：${e?.message}`);
      setErr(e?.message || "SETTLE_FAIL");
    } finally {
      setLoading(false);
    }
  }

  // 自動輪播（使用 stateRef 取得最新 state；避免閉包舊值）
  const autoLoop = useCallback(async () => {
    abortAutoRef.current.stop = false;

    while (!abortAutoRef.current.stop) {
      // 先拉一次最新狀態
      await fetchState();
      const cur = stateRef.current;
      const phase: Phase = cur?.phase ?? "SETTLED";

      if (phase === "BETTING") {
        let t = Math.max(0, cur?.secLeft ?? secs);
        log(`下注中… 倒數 ${t}s`);
        while (t > 1 && !abortAutoRef.current.stop) {
          await sleep(1000);
          t--;
        }
        if (abortAutoRef.current.stop) break;
        await settleRound();
        // 等待開牌動畫時間
        await sleep((REVEAL_SECONDS + 1) * 1000);
      } else if (phase === "REVEALING") {
        log("開牌中… 等待結束後自動進下一步");
        await sleep((REVEAL_SECONDS + 1) * 1000);
      } else {
        // SETTLED 或沒有開局 → 直接開新局
        await startRound();
        await sleep(600);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, secs]);

  useEffect(() => {
    if (autoRun) {
      log(`🔁 已啟用【自動輪播】（房間：${room}，${secs}s，揭示 ${REVEAL_SECONDS}s）`);
      autoLoop();
      return () => {
        abortAutoRef.current.stop = true;
      };
    } else {
      abortAutoRef.current.stop = true;
      log("⏹️ 已停止【自動輪播】");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, room]);

  const roundTitle = useMemo(() => {
    if (!state) return "—";
    const seq = state.roundSeq > 0 ? `#${String(state.roundSeq).padStart(4, "0")}` : "--";
    return `${seq}｜${state.phase}｜倒數 ${Math.max(0, state.secLeft || 0)}s`;
  }, [state]);

  return (
    <main className="admin-wrap">
      <header className="admin-header glass">
        <div className="left">
          <h1>百家樂（管理面板）</h1>
          <div className="sub">房間控制、人工結算、以及自動輪播</div>
        </div>
        <div className="right">
          <a className="btn" href="/admin">← 返回管理首頁</a>
        </div>
      </header>

      <section className="admin-controls glass">
        <div className="row">
          <div className="field">
            <label>房間</label>
            <div className="seg">
              {(["R30","R60","R90"] as RoomCode[]).map(rc => (
                <button key={rc} className={`seg-btn ${room===rc ? "active":""}`} onClick={()=>setRoom(rc)} disabled={loading || autoRun}>
                  {rc}（{ROOM_SECONDS[rc]}s）
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>目前局況</label>
            <div className="pill">{roundTitle}</div>
          </div>

          <div className="field">
            <label>自動輪播</label>
            <div className="seg">
              <button className={`seg-btn ${autoRun?"active":""}`} onClick={()=>setAutoRun(v=>!v)}>
                {autoRun ? "停止" : "開始"}
              </button>
            </div>
          </div>
        </div>

        <div className="row actions">
          <button className="btn primary" onClick={startRound} disabled={loading || autoRun}>開始新局</button>
          <button className="btn danger" onClick={settleRound} disabled={loading || autoRun}>立即結算</button>
        </div>

        {err && <div className="err">❌ {err}</div>}
      </section>

      <section className="admin-status glass">
        <div className="grid">
          <div className="card">
            <div className="title">房間</div>
            <div className="value">{state?.room?.name ?? room}</div>
          </div>
          <div className="card">
            <div className="title">回合 ID</div>
            <div className="value mono">{state?.roundId ?? "—"}</div>
          </div>
          <div className="card">
            <div className="title">局序</div>
            <div className="value">{state?.roundSeq ?? 0}</div>
          </div>
          <div className="card">
            <div className="title">狀態</div>
            <div className="value">{state?.phase ?? "—"}</div>
          </div>
          <div className="card">
            <div className="title">倒數</div>
            <div className="value">{Math.max(0, state?.secLeft || 0)}s</div>
          </div>
          <div className="card">
            <div className="title">結果</div>
            <div className="value">
              {state?.result ? `${state.result.outcome}（P:${state.result.p} / B:${state.result.b}）` : "—"}
            </div>
          </div>
        </div>
      </section>

      <section className="admin-logs glass">
        <div className="logs-head">
          <div className="title">操作紀錄</div>
          <button className="btn subtle" onClick={()=>setLogs([])}>清空</button>
        </div>
        <div className="logs">
          {logs.length === 0 ? <div className="muted">尚無紀錄</div> : logs.map((l,i)=>(<div className="log-line" key={i}>{l}</div>))}
        </div>
      </section>

      {/* 掛 CSS */}
      <link rel="stylesheet" href="/style/admin/baccarat-admin.css" />
    </main>
  );
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
