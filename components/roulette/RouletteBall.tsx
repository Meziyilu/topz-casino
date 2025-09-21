"use client";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "BETTING" | "REVEALING" | "SETTLED";

export default function RouletteBall({
  size = 360,
  phase,
  result,
  onRevealEnd,
  ballOnly = true, // <== 新增：預設只顯示球
}: {
  size?: number;
  phase: Phase;
  result?: number;
  onRevealEnd?: () => void;
  ballOnly?: boolean;
}) {
  const [angle, setAngle] = useState(0);
  const reqRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  // 球軌道半徑（比輪盤小一點）
  const radius = Math.floor(size * 0.36);

  // 目標落點角度（依你的盤面編號順序調整）
  const targetAngle = useMemo(() => {
    if (typeof result !== "number") return null;
    // 簡化：每格 ~9.73deg（360/37），0 在上方 12 點方向
    const step = 360 / 37;
    return (360 - result * step) % 360;
  }, [result]);

  useEffect(() => {
    // BETTING：慢慢巡迴
    if (phase === "BETTING") {
      cancel();
      const tick = () => {
        setAngle((a) => (a + 1.2) % 360); // 慢速
        reqRef.current = requestAnimationFrame(tick);
      };
      reqRef.current = requestAnimationFrame(tick);
      return cancel;
    }

    // REVEALING：10 秒收斂到 target
    if (phase === "REVEALING" && targetAngle != null) {
      cancel();
      startRef.current = null;
      const DUR = 10000; // 10s
      const startAngle = angle;

      const tick = (t: number) => {
        if (startRef.current == null) startRef.current = t;
        const el = Math.min(1, (t - startRef.current) / DUR);
        // easeOutCubic
        const e = 1 - Math.pow(1 - el, 3);
        const diff = shortestDiff(startAngle, targetAngle);
        setAngle((startAngle + diff * e + 360) % 360);

        if (el < 1) {
          reqRef.current = requestAnimationFrame(tick);
        } else {
          onRevealEnd?.();
        }
      };
      reqRef.current = requestAnimationFrame(tick);
      return cancel;
    }

    // 其他狀態：停止
    cancel();
  }, [phase, targetAngle]); // eslint-disable-line

  function cancel() {
    if (reqRef.current) cancelAnimationFrame(reqRef.current);
    reqRef.current = null;
  }

  return (
    <div
      className="roulette-ball"
      style={{
        position: ballOnly ? "absolute" : "relative",
        width: size,
        height: size,
        pointerEvents: "none",
      }}
    >
      {/* 若不是 ballOnly，你也可以在這裡放一層盤面圖，但我們預設只出球 */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
          transformOrigin: "center",
          width: size,
          height: size,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) translateX(${radius}px)`,
            width: Math.floor(size * 0.08),
            height: Math.floor(size * 0.08),
          }}
        >
          <Image
            src="/ui/roulette/ball.png"
            alt="ball"
            width={Math.floor(size * 0.08)}
            height={Math.floor(size * 0.08)}
            priority
            style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,.35))" }}
          />
        </div>
      </div>
    </div>
  );
}

/** 取兩角之間最短旋轉差（-180~180） */
function shortestDiff(from: number, to: number) {
  let d = ((to - from + 540) % 360) - 180;
  return d;
}
