"use client";

import { useEffect, useState } from "react";

type RoomCode = "R30" | "R60" | "R90";
type Phase = "BETTING" | "REVEALING" | "SETTLED";
type StateResp = {
  ok: boolean;
  room: { code: RoomCode; name: string; durationSeconds: number };
  roundId: string | null;
  phase: Phase;
  secLeft: number;
  result: null | { outcome: "PLAYER" | "BANKER" | "TIE"; p: number; b: number };
};

export default function AdminBaccaratPage() {
  const [room, setRoom] = useState<RoomCode>("R30");
  const [seconds, setSeconds] = useState<number>(30);
  const [status, setStatus] = useState<string>("");
  const [state, setState] = useState<StateResp | null>(null);
  const [settleOutcome, setSettleOutcome] = useState<"PLAYER" | "BANKER" | "TIE">("PLAYER");

  // 載入目前房間狀態
  const load = async () => {
    try {
      const r = await fetch(`/api/casino/baccarat/state?room=${room}`, {
        credentials: "include",
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "LOAD_FAIL");
      setState(j);
      setStatus("");
    } catch (e: any) {
      setStatus(`載入失敗：${e?.message || e}`);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 1000);
    return () => clearInterval(t);
  }, [room]);

  // 呼叫後端 API
  async function call(path: string, init?: RequestInit) {
    try {
      setStatus("執行中…");
      const r = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...(init || {}),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setStatus("成功 ✅");
      await load();
    } catch (e: any) {
      setStatus(`失敗：${e?.message || e} ❌`);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 text-white">
      <h1 className="text-2xl font-bold mb-4">百家樂控制台</h1>

      {/* 控制列 */}
      <div className="rounded-xl border border-white/15 p-4 bg-white/5 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <label>房間：</label>
          <select
            value={room}
            onChange={(e) => setRoom(e.target.value as RoomCode)}
            className="bg-transparent border border-white/20 rounded px-2 py-1"
          >
            <option value="R30">R30</option>
            <option value="R60">R60</option>
            <option value="R90">R90</option>
          </select>

          <label className="ml-4">每局秒數：</label>
          <input
            type="number"
            min={10}
            value={seconds}
            onChange={(e) => setSeconds(Math.max(10, Number(e.target.value || 30)))}
            className="bg-transparent border border-white/20 rounded px-2 py-1 w-24"
          />

          <button
            onClick={() => call(`/api/casino/baccarat/admin/start?room=${room}&seconds=${seconds}`)}
            className="ml-2 px-3 py-1 rounded bg-emerald-500/80 hover:bg-emerald-400 text-black font-semibold"
          >
            開新局（START）
          </button>

          <button
            onClick={() => call(`/api/casino/baccarat/admin/tick?room=${room}`)}
            className="px-3 py-1 rounded bg-cyan-400/90 hover:bg-cyan-300 text-black font-semibold"
          >
            手動 Tick
          </button>

          <span className="ml-auto text-sm opacity-80">{status}</span>
        </div>
      </div>

      {/* 強制結算 */}
      <div className="rounded-xl border border-white/15 p-4 bg-white/5 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <label>強制結算為：</label>
          <select
            value={settleOutcome}
            onChange={(e) => setSettleOutcome(e.target.value as any)}
            className="bg-transparent border border-white/20 rounded px-2 py-1"
          >
            <option value="PLAYER">PLAYER（閒）</option>
            <option value="BANKER">BANKER（莊）</option>
            <option value="TIE">TIE（和）</option>
          </select>
          <button
            onClick={() =>
              call(`/api/casino/baccarat/admin/settle?room=${room}`, {
                body: JSON.stringify({ outcome: settleOutcome }),
              })
            }
            className="px-3 py-1 rounded bg-rose-400/90 hover:bg-rose-300 text-black font-semibold"
          >
            強制結算（SETTLE）
          </button>
        </div>
      </div>

      {/* 狀態檢視 */}
      <div className="rounded-xl border border-white/15 p-4 bg-white/5">
        <div className="text-lg font-semibold mb-2">目前狀態</div>
        {state ? (
          <ul className="space-y-1 text-sm">
            <li>
              房間：<b>{state.room.name}</b>
            </li>
            <li>回合ID：{state.roundId ?? "—"}</li>
            <li>
              階段：<b>{state.phase}</b>
            </li>
            <li>
              倒數：<b>{state.secLeft}s</b>
            </li>
            <li>
              結果：<b>{state.result ? state.result.outcome : "—"}</b>
            </li>
          </ul>
        ) : (
          <div className="text-sm opacity-80">載入中…</div>
        )}
      </div>
    </main>
  );
}
