// app/casino/baccarat/[room]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Phase = "BETTING" | "REVEALING" | "SETTLED";
type Outcome = "PLAYER" | "BANKER" | "TIE" | null;
type BetSide = "PLAYER" | "BANKER" | "TIE" | "PLAYER_PAIR" | "BANKER_PAIR";

type StatePayload = {
  room: { code: "R30" | "R60" | "R90"; name: string; durationSeconds: number };
  roundId: string;
  roundSeq: number;
  phase: Phase;
  secLeft: number;
  result: { outcome: Outcome; p: number | null; b: number | null } | null;
  myBets: Record<string, number>;
  recent: { roundSeq: number; outcome: Outcome; p: number; b: number }[];
};

const BETS: { key: BetSide; label: string }[] = [
  { key: "PLAYER", label: "閒" },
  { key: "BANKER", label: "莊" },
  { key: "TIE", label: "和" },
  { key: "PLAYER_PAIR", label: "閒對" },
  { key: "BANKER_PAIR", label: "莊對" },
];

export default function BaccaratRoomPage() {
  const { room } = useParams<{ room: "R30" | "R60" | "R90" }>();
  const router = useRouter();
  const [data, setData] = useState<StatePayload | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [busy, setBusy] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");

  const title = useMemo(() => {
    switch (room) {
      case "R30":
        return "30秒房";
      case "R60":
        return "60秒房";
      case "R90":
        return "90秒房";
      default:
        return String(room);
    }
  }, [room]);

  // 輪詢狀態
  useEffect(() => {
    let t: any;
    const load = async () => {
      try {
        const r = await fetch(`/api/casino/baccarat/state?room=${room}`, {
          cache: "no-store",
          credentials: "include",
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "讀取失敗");
        setData(j);
        setErr("");
      } catch (e: any) {
        setErr(e?.message || "讀取失敗");
      }
    };
    load();
    t = setInterval(load, 1000);
    return () => clearInterval(t);
  }, [room]);

  const place = async (side: BetSide) => {
    if (!data) return;
    if (data.phase !== "BETTING") {
      setErr("非下注階段");
      return;
    }
    if (amount <= 0) {
      setErr("金額需 > 0");
      return;
    }
    try {
      setBusy(true);
      const r = await fetch(`/api/casino/baccarat/bet`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: data.room.code, side, amount }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "下注失敗");
      setErr("");
    } catch (e: any) {
      setErr(e?.message || "下注失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-casino px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button className="btn" onClick={() => router.push("/lobby")}>
            ← 返回大廳
          </button>
          <div className="text-2xl font-extrabold tracking-widest">{title}</div>
          <div />
        </div>

        {err && <div className="text-red-400 mb-3 text-sm">{err}</div>}

        {!data ? (
          <div className="glass rounded-xl p-6">載入中…</div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              {/* 左側：倒數與結果 */}
              <div className="glass rounded-xl p-6">
                <div className="text-sm opacity-70">
                  局序：<b className="tabular-nums">{data.roundSeq.toString().padStart(4, "0")}</b>
                </div>
                <div className="mt-2 text-sm opacity-70">
                  狀態：<b>{data.phase}</b>
                </div>
                <div className="mt-3">
                  <div className="text-6xl font-black tabular-nums">{data.secLeft}s</div>
                </div>

                {/* 開牌結果 */}
                {data.phase !== "BETTING" && data.result && (
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="card">
                      <div className="opacity-70 text-sm mb-1">PLAYER</div>
                      <div className="text-4xl font-extrabold">{data.result.p ?? "-"}</div>
                    </div>
                    <div className="card">
                      <div className="opacity-70 text-sm mb-1">BANKER</div>
                      <div className="text-4xl font-extrabold">{data.result.b ?? "-"}</div>
                    </div>
                    <div className="col-span-2 text-sm opacity-70">
                      結果：<b>{data.result.outcome ?? "-"}</b>
                    </div>
                  </div>
                )}
              </div>

              {/* 右側：下注面板 */}
              <div className="glass rounded-xl p-6">
                <div className="text-sm opacity-70 mb-2">下注金額</div>
                <div className="flex items-center gap-2">
                  <input
                    className="bg-black/30 rounded px-3 py-2 outline-none border border-white/10 w-40"
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
                  />
                  <div className="flex gap-2">
                    {[100, 500, 1000, 5000].map((v) => (
                      <button key={v} className="btn" onClick={() => setAmount(v)}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-5 gap-2">
                  {BETS.map((b) => (
                    <button
                      key={b.key}
                      disabled={busy || data.phase !== "BETTING"}
                      onClick={() => place(b.key)}
                      className="btn"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 text-sm opacity-70">
                  我這局投注：
                  <span className="ml-2">
                    {Object.keys(data.myBets ?? {}).length === 0
                      ? "（尚未下注）"
                      : Object.entries(data.myBets)
                          .map(([k, v]) => `${k}:${v}`)
                          .join("、")}
                  </span>
                </div>
              </div>
            </div>

            {/* 路子（近 20 局） */}
            <div className="glass rounded-xl p-6 mt-6">
              <div className="opacity-70 text-sm mb-3">近 20 局</div>
              <div className="flex flex-wrap gap-2">
                {data.recent.map((r) => (
                  <div
                    key={r.roundSeq}
                    className={`px-2 py-1 rounded text-xs border
                    ${
                      r.outcome === "PLAYER"
                        ? "border-cyan-400/50 text-cyan-200"
                        : r.outcome === "BANKER"
                        ? "border-rose-400/50 text-rose-200"
                        : "border-amber-400/50 text-amber-200"
                    }`}
                    title={`#${r.roundSeq} P:${r.p} B:${r.b}`}
                  >
                    #{r.roundSeq} {r.outcome ?? "-"}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
