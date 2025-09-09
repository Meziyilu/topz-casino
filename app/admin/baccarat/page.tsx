"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Room = "R30" | "R60" | "R90";

type StateResp = {
  ok: boolean;
  room: { code: Room; name: string; durationSeconds: number };
  day: string;        // YYYY-MM-DD（台北）
  roundId: string | null;
  roundSeq: number;
  phase: "BETTING" | "REVEALING" | "SETTLED";
  secLeft: number;
  result: null | { outcome: "PLAYER" | "BANKER" | "TIE"; p: number; b: number };
};

export default function BaccaratAdminAuto() {
  const [room, setRoom] = useState<Room>("R60");
  const [seconds, setSeconds] = useState<number>(60); // 每局下注秒數（可改）
  const [state, setState] = useState<StateResp | null>(null);
  const [auto, setAuto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string>("");

  // 每日重置（避免重複觸發）用的紀錄
  const lastResetDateRef = useRef<string>(""); // "YYYY-MM-DD"
  const stopFlagRef = useRef(false);

  /** 便利工具 */
  const appendLog = (line: string, payload?: any) =>
    setLog((prev) => `${new Date().toLocaleTimeString()} ${line}${payload ? `\n${JSON.stringify(payload)}` : ""}\n\n${prev}`);

  async function fetchState(r: Room) {
    const res = await fetch(`/api/casino/baccarat/state?room=${r}`, { cache: "no-store", credentials: "include" });
    const j = await res.json();
    setState(j);
    return j as StateResp;
  }

  async function post(url: string) {
    const res = await fetch(url, { method: "POST", credentials: "include" });
    const j = await res.json();
    appendLog(`${url}`, j);
    return j;
  }

  /** 一次完整流程：開局 -> 等下注秒數 -> 開牌 -> 等翻牌 → 結算 */
  async function runOneRound() {
    if (busy) return;
    setBusy(true);
    try {
      await post(`/api/casino/baccarat/admin/start?room=${room}&seconds=${seconds}`);

      // 等下注倒數（保守留 2 秒緩衝）
      const waitBet = Math.max(3, seconds - 2);
      await sleep(waitBet * 1000);

      // 開牌（讓前端有時間播動畫）
      await post(`/api/casino/baccarat/admin/reveal?room=${room}`);
      await sleep(3000);

      // 結算
      await post(`/api/casino/baccarat/admin/settle?room=${room}`);

      // 收尾：抓一次 state
      await fetchState(room);
    } catch (e: any) {
      appendLog("❌ 例外", { error: String(e?.message || e) });
    } finally {
      setBusy(false);
    }
  }

  /** 自動模式主 loop（頁面開著就會持續跑） */
  useEffect(() => {
    stopFlagRef.current = !auto;
    if (!auto) return;

    let mounted = true;

    (async () => {
      appendLog("🟢 自動模式啟動");
      // 立即拉一次狀態
      try { await fetchState(room); } catch {}

      while (mounted && !stopFlagRef.current) {
        // 先做每日 00:00 重置檢查
        try { await maybeDailyReset(); } catch (e: any) { appendLog("❌ 每日重置失敗", { error: String(e?.message || e) }); }

        // 開一局
        await runOneRound();

        // 小間隔，避免爆刷
        await sleep(1000);
      }

      appendLog("🛑 自動模式停止");
    })();

    return () => { mounted = false; stopFlagRef.current = true; };
  }, [auto, room, seconds]);

  /** 每日 00:00 重置：日界點觸發 */
  async function maybeDailyReset() {
    // 以台北時區判斷日期
    const now = new Date();
    const tz = "Asia/Taipei";
    const ymd = new Intl.DateTimeFormat("zh-TW", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
      .format(now)
      .replace(/\//g, "-") // 2025/09/09 -> 2025-09-09（粗略處理）
      .replace(/^(\d{4})-(\d{2})-(\d{2}).*$/, "$1-$2-$3");

    if (lastResetDateRef.current === "") {
      lastResetDateRef.current = ymd; // 首次記錄
      return;
    }

    if (ymd !== lastResetDateRef.current) {
      appendLog("🕛 跨日偵測到，執行每日重置…");
      // 讓當前局先結束（防止同時操作）
      if (busy) {
        appendLog("（等待當前局結束後再重置）");
        while (busy) { await sleep(500); }
      }
      // 重置 API：你之前有 daily-reset 或 daily-job 都行，擇一保留
      await post(`/api/casino/baccarat/admin/daily-reset`);
      lastResetDateRef.current = ymd;

      // 重置完，馬上開新局（不等自動 loop 下一輪）
      await runOneRound();
    }
  }

  /** 初始載入 */
  useEffect(() => { fetchState(room).catch(() => {}); }, [room]);

  const roundLabel = useMemo(() => (state?.roundId ? state.roundId.slice(-6).toUpperCase() : "-"), [state?.roundId]);

  return (
    <main className="min-h-screen bg-[#0b0f19] text-white">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-extrabold tracking-wide">🎛️ 百家樂管理（自動駕駛）</h1>

        {/* 控制列 */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-sm opacity-80 mb-2">房間</div>
            <div className="flex gap-2">
              {(["R30", "R60", "R90"] as Room[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoom(r)}
                  className={`px-3 py-2 rounded-lg border ${room === r ? "bg-white/15 border-white/40" : "bg-white/5 border-white/10 hover:border-white/25"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-sm opacity-80 mb-2">每局下注秒數</div>
            <input
              type="number"
              min={10}
              max={180}
              value={seconds}
              onChange={(e) => setSeconds(Math.max(10, Math.min(180, Number(e.target.value || 60))))}
              className="w-28 bg-transparent border border-white/20 rounded px-2 py-1 outline-none focus:border-white/40"
            />
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <button
              onClick={() => setAuto(true)}
              disabled={auto}
              className="px-4 py-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 disabled:opacity-50"
            >
              ▶ 開始自動
            </button>
            <button
              onClick={() => setAuto(false)}
              disabled={!auto}
              className="px-4 py-2 rounded-lg bg-rose-500/90 hover:bg-rose-500 disabled:opacity-50"
            >
              ■ 停止
            </button>
            <button
              onClick={() => runOneRound()}
              disabled={busy}
              className="ml-auto px-4 py-2 rounded-lg bg-sky-500/90 hover:bg-sky-500 disabled:opacity-50"
            >
              跑一局
            </button>
          </div>
        </div>

        {/* 現況卡片 */}
        <div className="grid md:grid-cols-3 gap-4">
          <InfoCard title="房間" value={state?.room?.name ?? room} />
          <InfoCard title="局號末 6 碼" value={roundLabel} />
          <InfoCard title="狀態" value={state?.phase ?? "-"} />
          <InfoCard title="倒數" value={typeof state?.secLeft === "number" ? `${state!.secLeft}s` : "-"} />
          <InfoCard title="結果" value={state?.result ? `${state.result.outcome}  閒${state.result.p} / 莊${state.result.b}` : "—"} />
          <InfoCard title="今日(台北)" value={state?.day ?? "—"} />
        </div>

        {/* 日誌 */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/10">
          <div className="font-semibold mb-2">執行日誌</div>
          <pre className="text-xs leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-auto">
            {log || "尚無輸出…"}
          </pre>
        </div>
      </div>
    </main>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="text-xs opacity-70">{title}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
