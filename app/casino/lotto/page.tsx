// app/casino/lotto/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMe } from "@/components/useMe";
import { useCss } from "@/components/useCss"; // 動態掛載 public/styles/lotto.css

type DrawLite = {
  id: string;
  code: number;
  drawAt: string;
  status: "OPEN" | "LOCKED" | "DRAWN" | "SETTLED";
  numbers: number[];
  special: number | null;
  pool: number;
  jackpot: number;
};

type StateResp = {
  current: DrawLite | null;
  last: { id: string; code: number; numbers: number[]; special: number | null } | null;
  config: {
    drawIntervalSec: number;
    lockBeforeDrawSec: number;
    picksCount: number;
    pickMax: number;
    betTiers: number[];
  };
  serverTime: string;
  locked: boolean;
};

type HistoryItem = {
  code: number;
  drawAt: string;
  numbers: number[];
  special: number | null;
  pool: number;
  jackpot: number;
  status?: "DRAWN" | "SETTLED";
};

function secsLeft(drawAt: string) {
  const t = new Date(drawAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((t - now) / 1000));
}

function classifyOddEven(nums: number[]) {
  const odd = nums.filter((n) => n % 2 === 1).length;
  const even = nums.length - odd;
  if (odd > even) return "road-win"; // 綠：奇多
  if (even > odd) return "road-low"; // 藍：偶多
  return "road-mid"; // 黃：平
}

function tinyColorBySpecial(n: number | null) {
  if (n == null) return "";
  return n % 2 === 1 ? "tiny-odd" : "tiny-even";
}

export default function LottoLobby() {
  useCss("/styles/lotto.css");

  const { me, loading: meLoading } = useMe(0);

  const [s, setS] = useState<StateResp | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [tick, setTick] = useState(0);

  async function pullState() {
    const r = await fetch("/api/casino/lotto/state", { cache: "no-store" });
    setS(await r.json());
  }

  async function pullHistory10() {
    const r = await fetch("/api/casino/lotto/history?take=10&includeDrawn=1", { cache: "no-store" });
    const j = await r.json();
    setHistory(j.items || []);
  }

  useEffect(() => {
    pullState();
    pullHistory10();
    const t = setInterval(() => {
      setTick((x) => x + 1);
      pullState();
      // 每 3 秒抓一次近 10 期即可
      if (((tick + 1) % 3) === 0) pullHistory10();
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const left = s?.current ? secsLeft(String(s.current.drawAt)) : 0;

  // 顯示的結果球列：優先當期（DRAWN），否則上一期
  const showDraw = useMemo(() => {
    if (s?.current?.status === "DRAWN") {
      return { code: s.current.code, nums: s.current.numbers ?? [], special: s.current.special ?? null };
    }
    if (s?.last) {
      return { code: s.last.code, nums: s.last.numbers ?? [], special: s.last.special ?? null };
    }
    return null;
  }, [s]);

  // 路子圖：拿近 30 期（用已有的 history 也可，只是此頁主訴求近 10 期；路子還是取 30 的話可另外再撈）
  // 這裡用 10 期做路子示例：想要 30 期可以另外再 fetch 一次
  const roadCells = useMemo(() => {
    const items = history.slice(0, 10);
    return items.map((it) => ({
      key: it.code,
      cls: classifyOddEven(it.numbers || []),
      tiny: tinyColorBySpecial(it.special ?? null),
      title: `#${it.code} 奇:${(it.numbers || []).filter((n) => n % 2 === 1).length} 偶:${(it.numbers || []).filter((n) => n % 2 === 0).length} 特:${it.special ?? "-"}`,
    }));
  }, [history]);

  return (
    <main className="lotto-lobby glass glow">
      <header className="lotto-head">
        <h1>樂透大廳</h1>
        <p className="sub">
          每 {s?.config.drawIntervalSec ?? 30}s 開獎 · 開獎前 {s?.config.lockBeforeDrawSec ?? 5}s 封盤
          {" · "}
          {meLoading ? "載入會員中…" : me ? `Hi, ${me.displayName || me.name || me.id} · 餘額 ${me.balance ?? 0}` : "未登入"}
        </p>
      </header>

      <section className="lotto-panels">
        {/* 左：本期資訊 + 已開出球（reveal） */}
        <div className="panel">
          <h3>本期（#{s?.current?.code ?? "-"})</h3>
          <div className="countdown">{left}s</div>
          <div className="status">{s?.current?.status ?? "-"}</div>
          <div className="pools">
            <div>
              Pool：<strong>{s?.current?.pool ?? 0}</strong>
            </div>
            <div>
              Jackpot：<strong>{s?.current?.jackpot ?? 0}</strong>
            </div>
          </div>

          <div className="balls balls-reveal">
            {showDraw?.nums.map((n) => (
              <div key={`n-${n}`} className="ball reveal">
                {n}
              </div>
            ))}
            {showDraw && showDraw.special != null && (
              <div className="ball special reveal">{showDraw.special}</div>
            )}
          </div>

          <Link href="/casino/lotto/play" className="btn-primary" style={{ marginTop: 8 }}>
            前往投注
          </Link>
        </div>

        {/* 右：上期結果 + 路子圖 + 近 10 期 */}
        <div className="panel">
          <h3>上期結果（#{s?.last?.code ?? "-"})</h3>
          {s?.last ? (
            <div className="balls">
              {s.last.numbers.map((n) => (
                <div key={n} className="ball">
                  {n}
                </div>
              ))}
              {s.last.special != null && <div className="ball special">{s.last.special}</div>}
            </div>
          ) : (
            <div className="muted">尚無</div>
          )}

          {/* 路子圖（用近 10 期，若要 30 期可再拉資料） */}
          <section className="road" style={{ marginTop: 14 }}>
            <div className="road-head">
              <div className="road-title">每期路子（近 10 期 / 奇偶占比）</div>
              <div className="road-legend">
                <span className="dot dot-win"></span>奇多
                <span className="dot dot-mid" style={{ marginLeft: 8 }}></span>持平
                <span className="dot dot-low" style={{ marginLeft: 8 }}></span>偶多
                <span className="dot" style={{ background: "#ef4444", marginLeft: 12 }}></span>特=奇
                <span className="dot" style={{ background: "#22d3ee" }}></span>特=偶
              </div>
            </div>
            <div className="road-grid">
              {roadCells.map((c) => (
                <div key={c.key} className={`road-cell ${c.cls}`} title={c.title}>
                  {c.tiny && <span className={`tiny ${c.tiny}`}></span>}
                </div>
              ))}
            </div>
          </section>

          {/* 近 10 期清單 */}
          <section className="panel" style={{ marginTop: 16 }}>
            <h3>近 10 期開獎</h3>
            {history.length === 0 ? (
              <div className="muted">尚無資料</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                {history.map((h) => (
                  <li key={h.code} className="glass" style={{ padding: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ minWidth: 90 }}>#{h.code}</div>
                      <div className="balls" style={{ gap: 6 }}>
                        {(h.numbers || []).map((n: number) => (
                          <div key={n} className="ball" style={{ width: 28, height: 28, fontSize: 12 }}>
                            {n}
                          </div>
                        ))}
                        {h.special != null && (
                          <div className="ball special" style={{ width: 28, height: 28, fontSize: 12 }}>
                            {h.special}
                          </div>
                        )}
                      </div>
                      <div className="muted" style={{ whiteSpace: "nowrap" }}>
                        {new Date(h.drawAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
                        {h.status === "DRAWN" && (
                          <span style={{ marginLeft: 8 }} className="badge yellow">
                            未結算
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
