"use client";
import { useEffect, useRef, useState } from "react";

/** 歐輪 (單零) 0–36 順時針排列（上方為 0 角度基準） */
const WHEEL_ORDER: number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const STEP = 360 / WHEEL_ORDER.length; // ≈ 9.7297°

/** 把「開獎號碼」轉成目標角度（0 在上方、順時針遞增） */
function angleForNumber(n: number): number {
  const idx = WHEEL_ORDER.indexOf(n);
  if (idx < 0) return 0;
  return idx * STEP;
}

export default function RouletteBall({
  size = 380,
  result,
  phase,
  onRevealEnd,
  idleSpeed = 12, // BETTING 閒置轉速（秒/圈）
  revealMs = 10000, // REVEALING 動畫時間（毫秒）
}: {
  size?: number;
  result?: number;
  phase: "BETTING" | "REVEALING" | "SETTLED";
  onRevealEnd?: () => void;
  idleSpeed?: number;
  revealMs?: number;
}) {
  const ringRef = useRef<HTMLDivElement>(null);
  const [deg, setDeg] = useState(0);

  // BETTING：慢速自轉
  useEffect(() => {
    if (phase !== "BETTING") return;
    if (!ringRef.current) return;
    const el = ringRef.current;
    el.style.transition = "transform 1s linear";
    let raf: number | null = null;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      // 每秒 360/idleSpeed 度
      setDeg((d) => d + (360 / idleSpeed) * dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [phase, idleSpeed]);

  // REVEALING：加幾圈後停到結果角度
  useEffect(() => {
    if (phase !== "REVEALING") return;
    if (!ringRef.current) return;

    const el = ringRef.current;
    // 起始角度：沿用目前 deg
    const start = deg % 360;
    // 目標角度（讓球在上方視為 0°，因此要反向：rotate 容器等於球沿邊跑）
    const target = result != null ? angleForNumber(result) : (start + 360) % 360;
    const extraTurns = 6 + Math.floor(Math.random() * 3); // 額外多轉 6~8 圈
    const endDeg = start + extraTurns * 360 + (target - start);

    // 平滑過渡
    el.style.transition = `transform ${revealMs}ms cubic-bezier(.25,.8,.25,1)`;
    requestAnimationFrame(() => setDeg(endDeg));

    const timer = setTimeout(() => {
      onRevealEnd?.();
    }, revealMs + 50);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, result]);

  // SETTLED：保持不動
  useEffect(() => {
    if (phase === "SETTLED" && ringRef.current) {
      ringRef.current.style.transition = "transform 400ms ease-out";
    }
  }, [phase]);

  return (
    <div
      className="rb-container"
      style={{
        width: size,
        height: size,
        position: "absolute",
        top: "50%",
        left: "50%",
        marginTop: -size / 2,
        marginLeft: -size / 2,
        pointerEvents: "none",
      }}
    >
      <div
        ref={ringRef}
        className="rb-ring"
        style={{
          width: "100%",
          height: "100%",
          transform: `rotate(${deg}deg)`,
          transformOrigin: "50% 50%",
          position: "relative",
        }}
      >
        {/* 珠子：放在頂部，靠旋轉父層來繞圈 */}
        <div
          className="rb-ball"
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 0,
            left: "50%",
            marginLeft: -8,
            boxShadow: "0 0 6px rgba(0,0,0,.6), 0 0 12px rgba(255,255,255,.6)",
          }}
        />
      </div>

      <style jsx>{`
        .rb-container {
          filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.35));
        }
      `}</style>
    </div>
  );
}
