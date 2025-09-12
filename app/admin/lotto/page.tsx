"use client";

import { useEffect, useMemo, useState } from "react";
import { useCss } from "@/components/useCss";

type Config = {
  drawIntervalSec: number;
  lockBeforeDrawSec: number;
  picksCount: number;
  pickMax: number;
  betTiers: number[];
  // 新增
  midnightReset: boolean;
  tailParityMult: number;
  tailSizeMult: number;
};

type State = {
  current: {
    id: string;
    code: number;
    drawAt: string;
    status: "OPEN" | "LOCKED" | "DRAWN" | "SETTLED";
    numbers: number[];
    special: number | null;
    pool: number;
    jackpot: number;
  } | null;
  last: { id: string; code: number; numbers: number[]; special: number | null } | null;
  config: Config;
  serverTime: string;
  locked: boolean;
};

type Draw = {
  id: string;
  code: number;
  drawAt: string;
  status: "OPEN" | "LOCKED" | "DRAWN" | "SETTLED";
  numbers: number[];
  special: number | null;
  pool: number;
  jackpot: number;
};

type BetRow = {
  id: string;
  userId: string;
  userName: string;
  userBalance: number;
  picks: number[];
  amount: number;
  createdAt: string;
};

function secsLeft(drawAt: string) {
  return Math.max(0, Math.floor((new Date(drawAt).getTime() - Date.now()) / 1000));
}

export default function AdminLottoPage() {
  useCss("/styles/admin-lotto.css");
  useCss("/styles/lotto.css"); // 借用球樣式

  const [state, setState] = useState<State | null>(null);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);

  const [draws, setDraws] = useState<Draw[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [bets, setBets] = useState<BetRow[]>([]);
  const [betsDrawId, setBetsDrawId] = useState<string>("");

  // 新增：重製後是否自動重啟
  const [autoRestart, setAutoRestart] = useState(true);

  // 拉狀態 + scheduler 狀態
  async function pullState() {
    const r = await fetch("/api/casino/lotto/state", { cache: "no-store" });
    const j = await r.json();
    setState(j);
    setCfg(j.config);
    const s = await fetch("/api/admin/lotto/scheduler", { cache: "no-store" }).then((r) => r.json());
    setRunning(!!s.running);
  }

  // 拉期數列表
  async function pullDraws() {
    const qs = new URLSearchParams();
    if (statusFilter) qs.set("status", statusFilter);
    qs.set("take", "80");
    const j = await fetch(`/api/admin/lotto/draws?${qs.toString()}`, { cache: "no-store" }).then((r) => r.json());
    setDraws(j.items || []);
  }

  // 查某期下注
  async function loadBets(drawId: string) {
    setBetsDrawId(drawId);
    const j = await fetch(`/api/admin/lotto/bets?drawId=${encodeURIComponent(drawId)}`, {
      cache: "no-store",
    }).then((r) => r.json());
    setBets(j.items || []);
  }

  useEffect(() => {
    pullState();
    pullDraws();
    const t = setInterval(() => {
      pullState();
      pullDraws();
    }, 1000);
    return () => clearInterval(t);
  }, [statusFilter]);

  const left = state?.current ? secsLeft(state.current.drawAt) : 0;

  // 操作：排程
  async function setScheduler(on: boolean) {
    await fetch("/api/admin/lotto/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: on ? "start" : "stop" }),
    });
    pullState();
  }

  // 操作：強制開獎（含結算）
  async function forceDraw() {
    await fetch("/api/admin/lotto/force-draw", { method: "POST" });
    pullState();
  }

  // 操作：手動日切（把未結束場次結束並建立對齊當天 00:00 的下一期）
  async function manualMidnightReset() {
    await fetch("/api/admin/lotto/midnight-reset", { method: "POST" });
    pullState();
    pullDraws();
  }

  // 操作：重製房間（清空期數與注單、局數歸 0，可選是否自動重啟）
  async function resetRoom() {
    if (!confirm("確定要重製房間？這會刪除所有期數與注單（不動錢包與帳務）。")) return;
    await fetch("/api/admin/lotto/reset-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restartScheduler: autoRestart }),
    });
    pullState();
    pullDraws();
  }

  // 儲存設定
  async function saveConfig(next: Partial<Config>) {
    setSaving(true);
    await fetch("/api/admin/lotto/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaving(false);
    pullState();
  }

  const tiersStr = useMemo(() => (cfg?.betTiers ?? []).join(", "), [cfg]);

  return (
    <div className="admin-wrap">
      <h1 style={{ margin: "0 0 8px" }}>樂透管理面板</h1>
      <div className="sub">開獎排程、配置、歷史期數與下注檢視（目前免 JWT，僅供開發環境）</div>

      {/* 狀態 + 控制 */}
      <div className="grid cols-3" style={{ marginTop: 16 }}>
        <section className="panel">
          <h3 className="h">目前期數</h3>
          {state?.current ? (
            <>
              <div className="flex">
                <span className="badge gray">#{state.current.code}</span>
                <span
                  className={`badge ${
                    state.current.status === "OPEN" ? "green" : state.current.status === "LOCKED" ? "yellow" : "red"
                  }`}
                >
                  {state.current.status}
                </span>
                <span className="badge gray">倒數 {left}s</span>
              </div>
              <div className="sep"></div>
              <div className="flex">
                <div className="card">
                  <div className="muted">Pool</div>
                  <div className="num">{state.current.pool}</div>
                </div>
                <div className="card">
                  <div className="muted">Jackpot</div>
                  <div className="num">{state.current.jackpot}</div>
                </div>
              </div>
              <div className="sep"></div>
              {/* 管理面板留著跑馬視覺 OK；前台已改為 reveal */}
              <div className="balls-roller">
                <div className="roller-track">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="ball rolling">
                      {((i * 11) % (state.config.pickMax || 49)) + 1}
                    </div>
                  ))}
                  {/* 複製一份內容讓動畫無縫 */}
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={`x-${i}`} className="ball rolling">
                      {((i * 11) % (state.config.pickMax || 49)) + 1}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="muted">沒有 OPEN/LOCKED 期數</div>
          )}
        </section>

        <section className="panel">
          <h3 className="h">控制</h3>
          <div className="flex" style={{ marginBottom: 10 }}>
            <span className={`badge ${running ? "green" : "red"}`}>Scheduler：{running ? "RUNNING" : "STOPPED"}</span>
            <button className="btn" onClick={() => setScheduler(true)}>
              啟動排程
            </button>
            <button className="btn warn" onClick={() => setScheduler(false)}>
              停止排程
            </button>
          </div>

          <div className="flex">
            <button className="btn danger" onClick={forceDraw}>
              強制開獎 + 結算
            </button>
          </div>

          <div className="sep"></div>
          <div className="muted">手動日切：將未結束場次結束，並建立對齊當天 00:00 的下一期。</div>
          <div className="flex">
            <button className="btn warn" onClick={manualMidnightReset}>
              手動日切重置（測試）
            </button>
          </div>

          <div className="sep"></div>
          <div className="muted">重製房間：刪除所有期數與注單（不動錢包與帳務），局數歸 0。</div>
          <div className="flex">
            <label className="flex" style={{ gap: 6 }}>
              <input type="checkbox" checked={autoRestart} onChange={(e) => setAutoRestart(e.target.checked)} />
              重製後自動重啟排程
            </label>
          </div>
          <div className="flex">
            <button className="btn danger" onClick={resetRoom}>
              重製房間（清期數與注單）
            </button>
          </div>
        </section>

        <section className="panel">
          <h3 className="h">配置（GameConfig.LOTTO）</h3>
          {cfg && (
            <>
              <div className="kv">
                <label>每局秒數</label>
                <input
                  className="input"
                  type="number"
                  defaultValue={cfg.drawIntervalSec}
                  onBlur={(e) => saveConfig({ drawIntervalSec: parseInt(e.target.value || "30", 10) })}
                />
              </div>
              <div className="kv">
                <label>鎖盤秒數</label>
                <input
                  className="input"
                  type="number"
                  defaultValue={cfg.lockBeforeDrawSec}
                  onBlur={(e) => saveConfig({ lockBeforeDrawSec: parseInt(e.target.value || "5", 10) })}
                />
              </div>
              <div className="kv">
                <label>選球數</label>
                <input
                  className="input"
                  type="number"
                  defaultValue={cfg.picksCount}
                  onBlur={(e) => saveConfig({ picksCount: parseInt(e.target.value || "6", 10) })}
                />
              </div>
              <div className="kv">
                <label>球號最大</label>
                <input
                  className="input"
                  type="number"
                  defaultValue={cfg.pickMax}
                  onBlur={(e) => saveConfig({ pickMax: parseInt(e.target.value || "49", 10) })}
                />
              </div>
              <div className="kv">
                <label>注金面額</label>
                <input
                  className="input"
                  defaultValue={tiersStr}
                  onBlur={(e) => {
                    const arr = e.target.value
                      .split(",")
                      .map((s) => parseInt(s.trim(), 10))
                      .filter((n) => !Number.isNaN(n));
                    saveConfig({ betTiers: arr });
                  }}
                />
              </div>

              {/* 新增：00:00 日切、尾數玩法賠率 */}
              <div className="kv">
                <label>00:00 日切重置</label>
                <select
                  className="select"
                  value={cfg.midnightReset ? "1" : "0"}
                  onChange={(e) => saveConfig({ midnightReset: e.target.value === "1" })}
                >
                  <option value="1">啟用</option>
                  <option value="0">停用</option>
                </select>
              </div>

              <div className="kv">
                <label>尾數單/雙 賠率</label>
                <input
                  className="input"
                  type="number"
                  defaultValue={cfg.tailParityMult}
                  onBlur={(e) => saveConfig({ tailParityMult: parseInt(e.target.value || "2", 10) })}
                />
              </div>

              <div className="kv">
                <label>尾數大/小 賠率</label>
                <input
                  className="input"
                  type="number"
                  defaultValue={cfg.tailSizeMult}
                  onBlur={(e) => saveConfig({ tailSizeMult: parseInt(e.target.value || "2", 10) })}
                />
              </div>

              {saving && <div className="muted">儲存中…</div>}
            </>
          )}
        </section>
      </div>

      {/* 歷史期數 */}
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="flex" style={{ justifyContent: "space-between" }}>
          <h3 className="h">期數列表</h3>
          <div className="flex">
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">全部</option>
              <option value="OPEN">OPEN</option>
              <option value="LOCKED">LOCKED</option>
              <option value="DRAWN">DRAWN</option>
              <option value="SETTLED">SETTLED</option>
            </select>
            <button className="btn ghost" onClick={pullDraws}>
              刷新
            </button>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>代碼</th>
              <th>開獎時間</th>
              <th>狀態</th>
              <th>結果</th>
              <th>Pool</th>
              <th>Jackpot</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {draws.map((d) => (
              <tr key={d.id}>
                <td>#{d.code}</td>
                <td>{new Date(d.drawAt).toLocaleString()}</td>
                <td>{d.status}</td>
                <td>
                  {d.numbers?.length ? (
                    <div className="flex">
                      {d.numbers.map((n) => (
                        <div key={n} className="ball" style={{ width: 28, height: 28, fontSize: 12 }}>
                          {n}
                        </div>
                      ))}
                      {d.special != null && (
                        <div className="ball special" style={{ width: 28, height: 28, fontSize: 12 }}>
                          {d.special}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>{d.pool}</td>
                <td>{d.jackpot}</td>
                <td className="flex">
                  <button className="btn ghost" onClick={() => loadBets(d.id)}>
                    看下注
                  </button>
                  {d.status !== "SETTLED" && (
                    <button className="btn warn" onClick={forceDraw}>
                      結算
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 指定期數下注 */}
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="flex" style={{ justifyContent: "space-between" }}>
          <h3 className="h">
            下注清單 {betsDrawId ? <span className="muted">（drawId: {betsDrawId}）</span> : null}
          </h3>
          <div className="flex">
            <button className="btn ghost" onClick={() => betsDrawId && loadBets(betsDrawId)}>
              刷新
            </button>
          </div>
        </div>

        {bets.length === 0 ? (
          <div className="muted">尚未選擇期數或無資料</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>下注ID</th>
                <th>玩家</th>
                <th>注金</th>
                <th>選號</th>
                <th>時間</th>
              </tr>
            </thead>
            <tbody>
              {bets.map((b) => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>
                    {b.userName || b.userId} <span className="muted">(餘額 {b.userBalance})</span>
                  </td>
                  <td>{b.amount}</td>
                  <td>{b.picks.join(", ")}</td>
                  <td>{new Date(b.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
