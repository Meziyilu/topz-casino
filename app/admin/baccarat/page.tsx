"use client";

import { useEffect, useMemo, useState } from "react";
import "@/../public/styles/baccarat.css";

type RoomCode = "R30" | "R60" | "R90";
type Phase = "BETTING" | "REVEALING" | "SETTLED";

type RoomStateItem = {
  room: RoomCode;
  seq: number;
  phase: Phase;
  endInSec: number;
  lockInSec: number;
};

type ConfigMap = Record<string, number | string | boolean | null>;

const DEFAULT_KEYS = [
  "BACCARAT:betSeconds",
  "BACCARAT:revealSeconds",
  "BACCARAT:payout:PLAYER",
  "BACCARAT:payout:BANKER",
  "BACCARAT:payout:TIE",
  "BACCARAT:payout:PLAYER_PAIR",
  "BACCARAT:payout:BANKER_PAIR",
  "BACCARAT:payout:ANY_PAIR",
  "BACCARAT:payout:PERFECT_PAIR",
  "BACCARAT:payout:BANKER_SUPER_SIX",
] as const;

export default function AdminBaccaratPage() {
  const [rooms, setRooms] = useState<RoomStateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cfg, setCfg] = useState<ConfigMap>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const orderedRooms = useMemo(
    () => ["R30", "R60", "R90"].map(r => rooms.find(x => x.room === (r as RoomCode))).filter(Boolean) as RoomStateItem[],
    [rooms]
  );

  useEffect(() => {
    const pull = async () => {
      try {
        const res = await fetch("/api/casino/baccarat/rooms");
        const data = await res.json();
        setRooms(data.items || []);
      } catch (e) {
        // ignore
      }
    };
    pull();
    const id = setInterval(pull, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loadCfg = async () => {
      const res = await fetch("/api/casino/baccarat/admin/config");
      const data = await res.json();
      setCfg(data.config || {});
    };
    loadCfg();
  }, []);

  const num = (v: any) => (typeof v === "number" ? v : Number(v ?? 0));

  const handleReset = async (room: RoomCode) => {
    setLoading(true);
    setMsg("");
    try {
      await fetch("/api/casino/baccarat/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room }),
      });
      setMsg(`已重置房間 ${room}（本局標記結束，下一次請求會自動開新局）`);
    } catch (e: any) {
      setMsg(`重置失敗：${e?.message || "UNKNOWN_ERROR"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestartShoe = async (room: RoomCode) => {
    setLoading(true);
    setMsg("");
    try {
      await fetch("/api/casino/baccarat/admin/restart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room }),
      });
      setMsg(`已重啟房間 ${room} 的牌靴（下一局會用新 seed）`);
    } catch (e: any) {
      setMsg(`重啟失敗：${e?.message || "UNKNOWN_ERROR"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCfgChange = (key: string, value: string) => {
    setCfg((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveCfg = async () => {
    setSaving(true);
    setMsg("");
    try {
      // 過濾允許的 key
      const body: Record<string, number | string | boolean> = {};
      for (const k of DEFAULT_KEYS) {
        const v = cfg[k] ?? null;
        if (v !== null && v !== undefined) {
          // 盡量用 number 儲存
          const maybeNumber = Number(v);
          body[k] = isNaN(maybeNumber) ? (v as any) : maybeNumber;
        }
      }
      await fetch("/api/casino/baccarat/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setMsg("設定已儲存。若需立即生效，請對各房按「重置本局」以啟動新局。");
    } catch (e: any) {
      setMsg(`儲存設定失敗：${e?.message || "UNKNOWN_ERROR"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-baccarat">
      <h1>管理端｜百家樂</h1>

      {msg && <div className="admin-hint">{msg}</div>}

      <section className="admin-cards">
        {orderedRooms.map((r) => (
          <div key={r.room} className="admin-card">
            <div className="admin-card__header">
              <h2>房間 {r.room}</h2>
              <div>局序：{r.seq}</div>
              <div>相位：{r.phase}</div>
            </div>
            <div className="admin-card__body">
              <div>下注倒數（endInSec）：{r.endInSec}s</div>
              <div>封盤倒數（lockInSec）：{r.lockInSec}s</div>
            </div>
            <div className="admin-card__actions">
              <button disabled={loading} onClick={() => handleReset(r.room)}>重置本局</button>
              <button disabled={loading} onClick={() => handleRestartShoe(r.room)}>重啟牌靴</button>
            </div>
          </div>
        ))}
      </section>

      <section className="admin-config">
        <h2>設定</h2>

        <div className="grid-2">
          <div className="admin-field">
            <label>下注秒數（預設 30）</label>
            <input
              type="number"
              value={cfg["BACCARAT:betSeconds"] ?? 30}
              onChange={(e) => handleCfgChange("BACCARAT:betSeconds", e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label>開獎秒數（預設 8）</label>
            <input
              type="number"
              value={cfg["BACCARAT:revealSeconds"] ?? 8}
              onChange={(e) => handleCfgChange("BACCARAT:revealSeconds", e.target.value)}
            />
          </div>
        </div>

        <h3>賠率設定</h3>
        <div className="grid-2">
          <RateInput
            label="閒 (PLAYER)"
            k="BACCARAT:payout:PLAYER"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="1"
          />
          <RateInput
            label="莊 (BANKER)"
            k="BACCARAT:payout:BANKER"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="0.95"
          />
          <RateInput
            label="和 (TIE)"
            k="BACCARAT:payout:TIE"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="8"
          />
          <RateInput
            label="閒對 (PLAYER_PAIR)"
            k="BACCARAT:payout:PLAYER_PAIR"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="11"
          />
          <RateInput
            label="莊對 (BANKER_PAIR)"
            k="BACCARAT:payout:BANKER_PAIR"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="11"
          />
          <RateInput
            label="任何對子 (ANY_PAIR)"
            k="BACCARAT:payout:ANY_PAIR"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="5"
          />
          <RateInput
            label="完美對子 (PERFECT_PAIR)"
            k="BACCARAT:payout:PERFECT_PAIR"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="25"
          />
          <RateInput
            label="超級六 (BANKER_SUPER_SIX)"
            k="BACCARAT:payout:BANKER_SUPER_SIX"
            cfg={cfg}
            onChange={handleCfgChange}
            placeholder="0.5"
          />
        </div>

        <div className="admin-actions">
          <button disabled={saving} onClick={handleSaveCfg}>儲存設定</button>
          <span className="note">※ 若要立即反映到牌局，請對房間按「重置本局」。</span>
        </div>
      </section>
    </div>
  );
}

function RateInput({
  label,
  k,
  cfg,
  onChange,
  placeholder,
}: {
  label: string;
  k: string;
  cfg: ConfigMap;
  onChange: (k: string, v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="admin-field">
      <label>{label}</label>
      <input
        type="number"
        step="0.01"
        value={cfg[k] ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(k, e.target.value)}
      />
    </div>
  );
}
