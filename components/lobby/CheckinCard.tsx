"use client";

import { useEffect, useState } from "react";

type CheckinState = {
  canClaim: boolean;
  streak: number;
  totalClaims: number;
  todayClaimed: boolean;
  todayAmount: number;
  nextAvailableAt: string | null;
};

export default function CheckinCard() {
  const [s, setS] = useState<CheckinState | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/checkin", { cache: "no-store" });
    const d = await r.json();
    setS(d);
  }

  async function claim() {
    if (!s?.canClaim) return;
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/checkin", { method: "POST" });
    const d = await r.json();
    setBusy(false);
    if (d.ok && !d.already) {
      setMsg(`簽到成功，獲得 ${d.amount} 金幣！`);
    } else {
      setMsg("今天已簽到。");
    }
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="lb-card">
      <div className="lb-card-title">每日簽到</div>

      {s ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div className="lb-row">
            <span className="lb-muted">連續天數</span>
            <b>{s.streak} 天</b>
          </div>
          <div className="lb-row">
            <span className="lb-muted">今日獎勵</span>
            <b>{s.todayAmount} 金幣</b>
          </div>

          {/* 特別提示：第 6 天後，隔天有 10000 金幣 */}
          {s.streak === 6 && s.canClaim && (
            <div className="lb-hint">🎉 明天簽到可領取 10000 金幣！</div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="lb-btn"
              onClick={claim}
              disabled={!s.canClaim || busy}
              style={{ padding: "10px 14px" }}
            >
              {s.canClaim ? (busy ? "領取中…" : "領取簽到獎勵") : "今日已簽到"}
            </button>
            {!s.canClaim && s.nextAvailableAt && (
              <span className="lb-muted" style={{ alignSelf: "center" }}>
                下次：{new Date(s.nextAvailableAt).toLocaleString()}
              </span>
            )}
          </div>

          {msg && <div className="lb-hint">{msg}</div>}
        </div>
      ) : (
        <div className="lb-muted">讀取中…</div>
      )}
    </div>
  );
}
