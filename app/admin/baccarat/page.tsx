"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ====== 型別(前端對齊 state API 輕量版) ====== */
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
  recent: { roundSeq: number; outcome: Outcome; p: number; b: number }[];
};

/** ====== 小工具 ====== */
function pad4(n: number) {
  return n.toString().padStart(4, "0");
}

async function fetchJson<T = any>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  try {
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const msg = (json && (json.error || json.message)) || res.statusText;
      throw new Error(String(msg));
    }
    return json as T;
  } catch (e) {
    // 不是 JSON（例如 404 HTML）
    if (!res.ok) throw new Error(text || res.statusText);
    throw e;
  }
}

/** ====== 管理面板頁 ====== */
export default function AdminBaccaratPage() {
  /** 狀態 */
  const [room, setRoom] = useState<RoomCode>("R60");
  const [state, setState] = useState<StateResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // 臨時秒數（記憶體配置）
  const [betSeconds, setBetSeconds] = useState<number>(60);
  const [revealSeconds, setRevealSeconds] = useState<number>(5);

  // 自動輪播
  const autoOnRef = useRef(false);
  const autoTickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 拉 state */
  const loadState = useCallback(async () => {
    try {
      const json = await fetchJson<StateResp>(`/api/casino/baccarat/state?room=${room}`);
      setState(json);
      setErr("");
    } catch (e: any) {
      setErr(e?.message || "載入失敗");
    }
  }, [room]);

  /** 啟動輪詢（每秒刷新狀態） */
  useEffect(() => {
    // 先載入一次
    loadState();
    if (pollingTimer.current) clearInterval(pollingTimer.current);
    pollingTimer.current = setInterval(loadState, 1000);
    return () => {
      if (pollingTimer.current) clearInterval(pollingTimer.current);
      pollingTimer.current = null;
    };
  }, [loadState]);

  /** 顯示訊息/錯誤 */
  const toast = useCallback((s: string) => {
    setMsg(s);
    setTimeout(() => setMsg(""), 3000);
  }, []);
  const toastErr = useCallback((s: string) => {
    setErr(s);
    setTimeout(() => setErr(""), 3500);
  }, []);

  /** ----- 各管理動作 API 包裝 ----- */
  const doStart = useCallback(async (sec?: number) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ room, seconds: String(sec ?? betSeconds) });
      await fetchJson(`/api/casino/baccarat/admin/start?${qs.toString()}`, { method: "POST" });
      toast("✅ 已開始新局");
      await loadState();
    } catch (e: any) {
      toastErr(`開始失敗：${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }, [room, betSeconds, loadState, toast, toastErr]);

  const doReveal = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ room });
      await fetchJson(`/api/casino/baccarat/admin/reveal?${qs.toString()}`, { method: "POST" });
      toast("🎬 已進入開牌");
      await loadState();
    } catch (e: any) {
      toastErr(`開牌失敗：${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }, [room, loadState, toast, toastErr]);

  const doSettle = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ room });
      const r = await fetchJson(`/api/casino/baccarat/admin/settle-now?${qs.toString()}`, { method: "POST" });
      toast(`💰 已結算：${r?.result?.outcome ?? ""}`);
      await loadState();
    } catch (e: any) {
      toastErr(`結算失敗：${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }, [room, loadState, toast, toastErr]);

  const doEndRefund = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ room });
      await fetchJson(`/api/casino/baccarat/admin/end?${qs.toString()}`, { method: "POST" });
      toast("🧾 已強制結束並退款");
      await loadState();
    } catch (e: any) {
      toastErr(`強制結束失敗：${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }, [room, loadState, toast, toastErr]);

  const doReset = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ room });
      await fetchJson(`/api/casino/baccarat/admin/reset?${qs.toString()}`, { method: "POST" });
      toast("🧹 已重置本房未結束回合");
      await loadState();
    } catch (e: any) {
      toastErr(`重置失敗：${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }, [room, loadState, toast, toastErr]);

  const doForceNext = useCallback(async (sec?: number) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ room, seconds: String(sec ?? betSeconds) });
      await fetchJson(`/api/casino/baccarat/admin/force-next?${qs.toString()}`, { method: "POST" });
      toast("⏭️ 已強制下一局");
      await loadState();
    } catch (e: any) {
      toastErr(`強制下一局失敗：${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }, [room, betSeconds, loadState, toast, toastErr]);

  const doSaveConfig = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ room });
      await fetchJson(`/api/casino/baccarat/admin/config?${qs.toString()}`, {
        method: "POST",
        body: JSON.stringify({ betSeconds, revealSeconds }),
      });
      toast("⚙️ 已更新臨時秒數");
    } catch (e: any) {
      toastErr(`設定失敗：${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }, [room, betSeconds, revealSeconds, toast, toastErr]);

  const doResetAll = useCallback(async () => {
    setLoading(true);
    try {
      await fetchJson(`/api/casino/baccarat/admin/reset-all`, { method: "POST" });
      toast("🧹 所有房間已重置未結束回合");
      await loadState();
    } catch (e: any) {
      toastErr(`重置全部失敗：${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }, [loadState, toast, toastErr]);

  /** 一鍵自動輪播（在同一分頁持續跑）：
   * BETTING 倒數→自動 reveal→等 revealSeconds→settle→force-next
   * 任何一步失敗 → reset → force-next
   */
  const startAuto = useCallback(() => {
    if (autoOnRef.current) return;
    autoOnRef.current = true;
    toast(`🔁 已啟用【自動輪播】（房間：${room}，${betSeconds}s，揭示 ${revealSeconds}s）`);

    if (autoTickTimer.current) clearInterval(autoTickTimer.current);
    autoTickTimer.current = setInterval(async () => {
      if (!autoOnRef.current) return;
      try {
        await loadState();
        const s = stateRef.current; // 用 ref 取最新
        const phase: Phase = (s?.phase ?? "SETTLED");
        const secLeft = s?.secLeft ?? 0;

        if (phase === "BETTING") {
          if (secLeft <= 0) {
            await doReveal();
          }
        } else if (phase === "REVEALING") {
          // 等 revealSeconds 就結算
          await doSettle();
        } else if (phase === "SETTLED") {
          // 立刻開下一局
          await doForceNext();
        }
      } catch (e) {
        // 任何錯誤：重置本房並嘗試下一局
        try {
          await doReset();
          await doForceNext();
        } catch {}
      }
    }, 1000);
  }, [room, betSeconds, revealSeconds, loadState, doReveal, doSettle, doForceNext, doReset, toast]);

  const stopAuto = useCallback(() => {
    autoOnRef.current = false;
    if (autoTickTimer.current) clearInterval(autoTickTimer.current);
    autoTickTimer.current = null;
    toast("⏹️ 已停止【自動輪播】");
  }, [toast]);

  /** 用 ref 持有最新 state（給自動輪播回調使用） */
  const stateRef = useRef<StateResp | null>(null);
  useEffect(() => { stateRef.current = state; }, [state]);

  /** 切房時，嘗試抓一下房的臨時設定（可省） */
  useEffect(() => {
    (async () => {
      try {
        const qs = new URLSearchParams({ room });
        const cfg = await fetchJson<{ ok: boolean; room: RoomCode; config: { betSeconds: number; revealSeconds: number } }>(
          `/api/casino/baccarat/admin/config?${qs.toString()}`
        );
        if (cfg?.config) {
          setBetSeconds(cfg.config.betSeconds ?? 60);
          setRevealSeconds(cfg.config.revealSeconds ?? 5);
        }
      } catch {
        // ignore
      }
    })();
  }, [room]);

  /** UI 用資料 */
  const phaseLabel = useMemo(() => {
    const p = state?.phase;
    return p === "BETTING" ? "下注中" : p === "REVEALING" ? "開牌中" : p === "SETTLED" ? "已結算" : "—";
  }, [state?.phase]);

  /** =============== Render =============== */
  return (
    <main className="admin-wrap text-white min-h-screen bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(96,165,250,.12),transparent_60%),radial-gradient(1000px_800px_at_110%_10%,rgba(167,139,250,.12),transparent_60%),radial-gradient(800px_700px_at_50%_110%,rgba(253,164,175,.12),transparent_60%)] p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-extrabold">百家樂｜管理面板</h1>
          <div className="flex items-center gap-2">
            <select
              value={room}
              onChange={(e) => setRoom(e.target.value as RoomCode)}
              className="bg-white/10 border border-white/20 rounded px-3 py-2 outline-none"
              title="切換房間"
            >
              <option value="R30">R30（30s）</option>
              <option value="R60">R60（60s）</option>
              <option value="R90">R90（90s）</option>
            </select>

            {!autoOnRef.current ? (
              <button
                onClick={startAuto}
                className="px-4 py-2 rounded bg-emerald-500/80 hover:bg-emerald-500 transition"
              >
                啟用自動輪播
              </button>
            ) : (
              <button
                onClick={stopAuto}
                className="px-4 py-2 rounded bg-rose-500/80 hover:bg-rose-500 transition"
              >
                停止自動輪播
              </button>
            )}
          </div>
        </header>

        {/* 狀態卡 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <div className="text-sm opacity-80">房間</div>
            <div className="text-xl font-bold">{state?.room?.name ?? room}</div>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <div className="text-sm opacity-80">局序</div>
            <div className="text-xl font-bold">{pad4(state?.roundSeq ?? 0)}</div>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <div className="text-sm opacity-80">狀態 / 倒數</div>
            <div className="text-xl font-bold">
              {phaseLabel} {typeof state?.secLeft === "number" ? ` · ${state?.secLeft}s` : ""}
            </div>
          </div>
        </section>

        {/* 操作列 */}
        <section className="rounded-2xl border border-white/15 bg-white/5 p-4 mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-xs opacity-80">下注秒數</div>
              <input
                type="number"
                className="w-28 bg-white/10 border border-white/20 rounded px-3 py-2 outline-none"
                value={betSeconds}
                min={5}
                onChange={(e) => setBetSeconds(Math.max(5, Number(e.target.value || 0)))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs opacity-80">揭示秒數</div>
              <input
                type="number"
                className="w-28 bg-white/10 border border-white/20 rounded px-3 py-2 outline-none"
                value={revealSeconds}
                min={0}
                onChange={(e) => setRevealSeconds(Math.max(0, Number(e.target.value || 0)))}
              />
            </div>

            <button onClick={() => doSaveConfig()} className="px-4 py-2 rounded bg-sky-500/80 hover:bg-sky-500 transition">
              儲存秒數
            </button>

            <div className="grow" />

            <button disabled={loading} onClick={() => doStart()} className="px-4 py-2 rounded bg-emerald-600/80 hover:bg-emerald-600 transition">
              開始
            </button>
            <button disabled={loading} onClick={() => doReveal()} className="px-4 py-2 rounded bg-amber-500/80 hover:bg-amber-500 transition">
              強制開牌
            </button>
            <button disabled={loading} onClick={() => doSettle()} className="px-4 py-2 rounded bg-yellow-500/80 hover:bg-yellow-500 transition">
              立即結算
            </button>
            <button disabled={loading} onClick={() => doForceNext()} className="px-4 py-2 rounded bg-indigo-500/80 hover:bg-indigo-500 transition">
              強制下一局
            </button>
            <button disabled={loading} onClick={() => doEndRefund()} className="px-4 py-2 rounded bg-rose-600/80 hover:bg-rose-600 transition">
              強制結束(退款)
            </button>
            <button disabled={loading} onClick={() => doReset()} className="px-4 py-2 rounded bg-slate-600/80 hover:bg-slate-600 transition">
              重置本局
            </button>
            <button disabled={loading} onClick={() => doResetAll()} className="px-4 py-2 rounded bg-slate-700/80 hover:bg-slate-700 transition">
              重置所有房
            </button>
          </div>
        </section>

        {/* 結果 / 最近紀錄 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="font-bold mb-2">本局結果</div>
            {state?.result ? (
              <div className="text-lg">
                結果：<b>{state.result.outcome}</b>（閒 {state.result.p} / 莊 {state.result.b}）
              </div>
            ) : (
              <div className="opacity-70">尚無結果</div>
            )}
            <div className="text-sm opacity-80 mt-2">RoundID：{state?.roundId ?? "—"}</div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="font-bold mb-3">近 20 局</div>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead className="opacity-70">
                  <tr>
                    <th className="text-left py-1 pr-2">局序</th>
                    <th className="text-left py-1 pr-2">結果</th>
                    <th className="text-left py-1 pr-2">閒點</th>
                    <th className="text-left py-1 pr-2">莊點</th>
                  </tr>
                </thead>
                <tbody>
                  {(state?.recent ?? []).map((r, i) => (
                    <tr key={i} className="border-t border-white/10">
                      <td className="py-1 pr-2">{pad4(r.roundSeq)}</td>
                      <td className="py-1 pr-2">{r.outcome}</td>
                      <td className="py-1 pr-2">{r.p}</td>
                      <td className="py-1 pr-2">{r.b}</td>
                    </tr>
                  ))}
                  {(!state || (state && state.recent.length === 0)) && (
                    <tr><td className="py-2 opacity-60" colSpan={4}>暫無資料</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 訊息列 */}
        {(msg || err) && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50">
            {msg && <div className="mb-2 rounded bg-emerald-500/90 px-4 py-2 shadow-lg">{msg}</div>}
            {err && <div className="rounded bg-rose-500/90 px-4 py-2 shadow-lg">{err}</div>}
          </div>
        )}
      </div>

      {/* 你的管理專用 CSS（可改路徑；沒有也 OK） */}
      <link rel="stylesheet" href="/styles/admin/baccarat.css" />
    </main>
  );
}
