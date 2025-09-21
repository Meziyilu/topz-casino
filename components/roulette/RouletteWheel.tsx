"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "BETTING" | "REVEALING" | "SETTLED";

/** 歐式輪盤號序（0 綠 + 1~36 紅黑交錯的標準順序，順時針） */
const ORDER: number[] = [
  0, 32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,
  20,14,31,9,22,18,29,7,28,12,35,3,26
];

function angleForNumber(n: number) {
  const i = ORDER.indexOf(n);
  if (i < 0) return 0;
  const step = 360 / ORDER.length; // 約 9.7297°
  // 讓 0 位於正上方（-90度），再加上格 index
  return -90 + i * step;
}

export default function RouletteWheel({
  size = 260,
  phase,
  result,
  spinMs = 9000,      // 揭示動畫 9s 減速
  idleSpeed = 8,      // BETTING 時慢速自轉（每秒度數）
}: {
  size?: number;
  phase: Phase;
  result?: number | null;
  spinMs?: number;
  idleSpeed?: number;
}) {
  const ringRef = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState<number>(0);     // 目前旋轉角度（deg）
  const [spinning, setSpinning] = useState<boolean>(false);

  // 半徑（球心到中心），留一點邊距
  const R = useMemo(() => size * 0.41, [size]);

  // BETTING：球慢速繞圈；REVEALING：一次減速到結果；SETTLED：停住
  useEffect(() => {
    let t: number | null = null;
    if (phase === "BETTING") {
      setSpinning(true);
      const tick = () => {
        setAngle(a => a + idleSpeed);               // 每 1/60s 加一些角度
        t = requestAnimationFrame(tick);
      };
      t = requestAnimationFrame(tick);
      return () => { if (t) cancelAnimationFrame(t); };
    }
    if (phase === "REVEALING" && typeof result === "number") {
      if (t) cancelAnimationFrame(t);
      setSpinning(false);

      // 目標角：為了好看，先加上多圈，再落到目標
      const target = angleForNumber(result);
      const current = angle % 360;
      const extraTurns = 10 * 360;                  // 多轉 10 圈
      // 計算最短正向路徑到 target
      const delta = ((target - current + 360) % 360);
      const finalAngle = angle + extraTurns + delta;

      // 用 CSS transition 做減速
      if (ringRef.current) {
        ringRef.current.style.transition = `transform ${spinMs}ms cubic-bezier(0.07, 0.8, 0.12, 1)`;
      }
      // 下一幀套用
      requestAnimationFrame(() => setAngle(finalAngle));
      // 結束後清掉 transition，避免下一局殘留
      const clear = setTimeout(() => {
        if (ringRef.current) ringRef.current.style.transition = "none";
      }, spinMs + 60);
      return () => clearTimeout(clear);
    }
    if (phase === "SETTLED") {
      setSpinning(false);
      if (ringRef.current) ringRef.current.style.transition = "none";
    }
  }, [phase, result]); // eslint-disable-line

  return (
    <div
      className="rw-wrap glass"
      style={{
        width: size, height: size, position: "relative",
        borderRadius: "16px", display: "grid", placeItems: "center",
        background: "rgba(255,255,255,0.04)", backdropFilter: "blur(10px)",
        boxShadow: "0 6px 22px rgba(0,0,0,.25) inset, 0 12px 30px rgba(0,0,0,.25)"
      }}
    >
      {/* 靜態盤面 */}
      <img
        src="/images/roulette/wheel.png"
        alt="roulette-wheel"
        style={{ width: "86%", height: "86%", objectFit: "contain", filter: "drop-shadow(0 4px 6px rgba(0,0,0,.35))" }}
      />

      {/* 球的「軌道」：繞中心旋轉，球偏移 R 半徑 */}
      <div
        ref={ringRef}
        style={{
          position: "absolute",
          width: size, height: size, left: 0, top: 0,
          transform: `rotate(${angle}deg)`,
          transformOrigin: "50% 50%",
          transition: spinning ? "none" : undefined,
          pointerEvents: "none",
        }}
      >
        <img
          src="/images/roulette/ball.png"
          alt="ball"
          style={{
            position: "absolute",
            left: "50%", top: "50%",
            // 先把中心移到容器中心，再往上偏移 R（在最上方起點）
            transform: `translate(-50%, -50%) translateY(-${R}px)`,
            width: Math.max(12, size * 0.09),
            height: Math.max(12, size * 0.09),
            objectFit: "contain",
            filter: "drop-shadow(0 2px 5px rgba(0,0,0,.5)) brightness(1.05)",
          }}
        />
      </div>

      {/* 小圓心 + 高光 */}
      <div
        aria-hidden
        style={{
          position: "absolute", width: size*0.08, height: size*0.08, borderRadius: "50%",
          background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,.5), rgba(255,255,255,0) 60%), #111",
          boxShadow: "0 0 10px rgba(0,0,0,.5), inset 0 0 10px rgba(255,255,255,.08)"
        }}
      />
    </div>
  );
}
