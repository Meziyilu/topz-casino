"use client";

import Head from "next/head";
import { useEffect, useRef, useState } from "react";

/** === 型別 === */
type RoomCode = "SB_R30" | "SB_R60" | "SB_R90";
type Phase = "BETTING" | "REVEALING" | "SETTLED";

type StateApi = {
  room: RoomCode;
  round: { id: string; phase: Phase; startedAt: string; endedAt?: string; dice: number[] };
  timers: { lockInSec: number; endInSec: number };
  locked: boolean;
};

type HistoryApi = {
  items: { id: string; dice: number[]; endedAt: string }[];
};

type ConfigMap = Record<string, any>;

/** === 小工具 === */
function cx(...xs: (string | false | null | undefined)[]) { return xs.filter(Boolean).join(" "); }
function shortId(id?: string) { return id ? id.slice(-6) : "-"; }
function fmt(sec?: number) {
  const s = Math.max(0, Math.floor(sec ?? 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
function sum(d: number[]) { return (d?.[0] ?? 0) + (d?.[1] ?? 0) + (d?.[2] ?? 0); }
function isTriple(d: number[]) { return d?.[0] === d?.[1] && d?.[1] === d?.[2] && d?.[0] != null; }

/** === 讀取 Hook：單房間狀態 === */
function useRoom(room: RoomCode, pollMs = 3000) {
  const [state, setState] = useState<StateApi | null>(null);
  const [hist, setHist] = useState<HistoryApi["items"]>([]);
  const [lockLeft, setLockLeft] = useState(0);
  const [endLeft, setEndLeft] = useState(0);
  const tickRef = useRef<number | null>(null);

  const load = async () => {
    const rs = await fetch(`/api/casino/sicbo/state?room=${room}`, { cache: "no-store" });
    const s: StateApi = await rs.json();
    setState(s);
    setLockLeft(s.timers.lockInSec);
    setEndLeft(s.timers.endInSec);

    const rh = await fetch(`/api/casino/sicbo/history?room=${room}&limit=8`, { cache: "no-store" });
    const h: HistoryApi = await rh.json();
    setHist(h.items || []);
  };

  useEffect(() => {
    load();
    const poll = setInterval(load, pollMs);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      setLockLeft(v => (v > 0 ? v - 1 : 0));
      setEndLeft(v => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => {
      clearInterval(poll);
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, pollMs]);

  return { state, hist, lockLeft, endLeft, reload: load };
}

/** === 骰子元件（已整合骰子 CSS） === */
function Dice({ n, rolling, size = "md" }: { n?: number; rolling?: boolean; size?: "sm" | "md" | "lg" }) {
  const faceCls = n ? `face-${n}` : "";
  const sizeCls = size === "sm" ? "dice-sm" : size === "lg" ? "dice-lg" : "";
  const rollingCls = rolling ? "rolling" : "";
  return (
    <span className={cx("dice", faceCls, sizeCls, rollingCls)}>
      <span className="pip p1" /><span className="pip p2" /><span className="pip p3" />
      <span className="pip p4" /><span className="pip p5" /><span className="pip p6" />
      <span className="pip p7" /><span className="pip p8" /><span className="pip p9" />
    </span>
  );
}

/** === 單房間卡片 === */
function LiveRoomCard({ room }: { room: RoomCode }) {
  const { state, hist, lockLeft, endLeft, reload } = useRoom(room);
  const phase = state?.round?.phase;
  const dice = state?.round?.dice || [];
  const rolling = phase === "REVEALING";

  return (
    <div className="admin-card">
      <div className="admin-card__head">
        <div className="admin-card__title">{room}</div>
        <button className="btn btn--ghost" onClick={reload}>刷新</button>
      </div>

      <div className="admin-room__stats">
        <div className="stat"><div className="stat__k">Round</div><div className="stat__v">{shortId(state?.round?.id)}</div></div>
        <div className="stat"><div className="stat__k">Phase</div><div className="stat__v">{phase ?? "-"}</div></div>
        <div className="stat"><div className="stat__k">Lock</div><div className="stat__v">{fmt(lockLeft)}</div></div>
        <div className="stat"><div className="stat__k">End</div><div className="stat__v">{fmt(endLeft)}</div></div>
      </div>

      <div className="admin-room__dice">
        <Dice n={dice[0]} rolling={rolling && !dice[0]} size="lg" />
        <Dice n={dice[1]} rolling={rolling && !dice[1]} size="lg" />
        <Dice n={dice[2]} rolling={rolling && !dice[2]} size="lg" />
      </div>

      <div className="admin-room__history">
        {hist.length ? hist.map(h => (
          <div key={h.id} className="hcell">
            <div className="hcell__dice">
              <Dice n={h.dice[0]} size="sm" />
              <Dice n={h.dice[1]} size="sm" />
              <Dice n={h.dice[2]} size="sm" />
            </div>
            <div className="hcell__text">
              Sum <b>{sum(h.dice)}</b>{isTriple(h.dice) ? <span className="tag tag--triple">Triple</span> : null}
            </div>
            <div className="hcell__time">{new Date(h.endedAt).toLocaleTimeString()}</div>
          </div>
        )) : <div className="admin-empty">尚無歷史</div>}
      </div>
    </div>
  );
}

/** === Config Input === */
function ConfigInput({ label, k, config, setConfig }: { label: string; k: string; config: ConfigMap; setConfig: (updater: (c: ConfigMap) => ConfigMap) => void }) {
  return (
    <label className="cfg-input">
      <span className="cfg-input__label">{label}</span>
      <input
        type="number"
        value={config?.[k] ?? ""}
        onChange={(e) => setConfig((c) => ({ ...c, [k]: Number(e.target.value) }))}
        className="cfg-input__control"
      />
    </label>
  );
}

/** === 主頁 === */
export default function SicboAdminPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ConfigMap>({});
  const [saving, setSaving] = useState(false);
  const [settleRoundId, setSettleRoundId] = useState("");
  const [autoRotate, setAutoRotate] = useState(false);

  async function loadConfig() {
    setLoading(true);
    const res = await fetch("/api/casino/sicbo/admin/config", { cache: "no-store" });
    const js = await res.json();
    setConfig(js.items || {});
    setAutoRotate(js.items?.autoRotate ?? false);
    setLoading(false);
  }

  async function saveConfig() {
    setSaving(true);
    await fetch("/api/casino/sicbo/admin/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    alert("已更新設定");
  }

  async function toggleAutoRotate() {
    const newVal = !autoRotate;
    setAutoRotate(newVal);
    await fetch("/api/casino/sicbo/admin/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...config, autoRotate: newVal }),
    });
    alert(`自動開局已${newVal ? "啟用" : "停用"}`);
  }

  async function roll(room: RoomCode) {
    const res = await fetch("/api/casino/sicbo/admin/roll", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room }),
    });
    const js = await res.json();
    alert(`手動開獎完成\nRoom: ${room}\nDice: ${js.dice}`);
  }

  async function restart(room: RoomCode) {
    const res = await fetch("/api/casino/sicbo/admin/restart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room }),
    });
    const js = await res.json();
    alert(`房間 ${room} 已強制開新局\nRound: ${js.roundId}`);
  }

  async function settle() {
    if (!settleRoundId) return alert("請輸入 roundId");
    const res = await fetch("/api/casino/sicbo/admin/settle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roundId: settleRoundId }),
    });
    const js = await res.json();
    alert(`局 ${js.roundId} 已結算\nDice: ${js.dice}`);
  }

  useEffect(() => { loadConfig(); }, []);

  return (
    <>
      <Head>
        {/* 單一獨立 CSS */}
        <link rel="stylesheet" href="/styles/admin/sicbo-admin.css" />
      </Head>

      <main className="admin-sicbo">
        <header className="admin-sicbo__head glass">
          <h1>骰寶管理</h1>
          <p className="sub">即時狀態、參數調整與手動控制</p>
        </header>

        {/* 即時狀態 */}
        <section className="admin-section">
          <h2 className="admin-section__title">即時狀態</h2>
          <div className="admin-grid admin-grid--3">
            <LiveRoomCard room="SB_R30" />
            <LiveRoomCard room="SB_R60" />
            <LiveRoomCard room="SB_R90" />
          </div>
        </section>

        {/* 設定 */}
        <section className="admin-section">
          <h2 className="admin-section__title">參數設定</h2>
          {loading ? (
            <div className="admin-empty">讀取設定中…</div>
          ) : (
            <div className="admin-card">
              <div className="cfg-grid">
                <ConfigInput label="預設局間秒數" k="drawIntervalSec" config={config} setConfig={setConfig} />
                <ConfigInput label="封盤前秒數" k="lockBeforeRollSec" config={config} setConfig={setConfig} />
                <ConfigInput label="下注最小金額" k="bet.min" config={config} setConfig={setConfig} />
                <ConfigInput label="下注最大金額" k="bet.max" config={config} setConfig={setConfig} />
                <ConfigInput label="單局下注總上限" k="bet.totalMaxPerRound" config={config} setConfig={setConfig} />
                <ConfigInput label="R30 間隔秒數" k="room.SB_R30.drawIntervalSec" config={config} setConfig={setConfig} />
                <ConfigInput label="R60 間隔秒數" k="room.SB_R60.drawIntervalSec" config={config} setConfig={setConfig} />
                <ConfigInput label="R90 間隔秒數" k="room.SB_R90.drawIntervalSec" config={config} setConfig={setConfig} />
              </div>
              <div className="cfg-actions">
                <button onClick={saveConfig} disabled={saving} className="btn btn--primary">
                  {saving ? "儲存中…" : "儲存設定"}
                </button>
                <button onClick={loadConfig} className="btn btn--ghost">重新載入</button>
              </div>
            </div>
          )}
        </section>

        {/* 手動控制 */}
        <section className="admin-section">
          <h2 className="admin-section__title">手動控制</h2>
          <div className="admin-card">
            <div className="manual-grid">
              <button onClick={() => roll("SB_R30")} className="btn btn--blue">R30 手動開獎</button>
              <button onClick={() => roll("SB_R60")} className="btn btn--blue">R60 手動開獎</button>
              <button onClick={() => roll("SB_R90")} className="btn btn--blue">R90 手動開獎</button>
            </div>

            <div className="manual-grid spacer-12">
              <button onClick={() => restart("SB_R30")} className="btn btn--primary">R30 強制新局</button>
              <button onClick={() => restart("SB_R60")} className="btn btn--primary">R60 強制新局</button>
              <button onClick={() => restart("SB_R90")} className="btn btn--primary">R90 強制新局</button>
            </div>

            <div className="manual-row">
              <input
                value={settleRoundId}
                onChange={(e) => setSettleRoundId(e.target.value)}
                placeholder="指定 roundId"
                className="manual-input"
              />
              <button onClick={settle} className="btn btn--danger">指定局結算</button>
            </div>

            <div className="spacer-16">
              <label className="switch">
                <input type="checkbox" checked={autoRotate} onChange={toggleAutoRotate} />
                <span className="pill"><span className="dot" /></span>
                <span>啟用自動開局</span>
              </label>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
