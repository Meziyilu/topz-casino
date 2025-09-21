"use client";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "BETTING" | "REVEALING" | "SETTLED";

/** 只渲染「球」：沿圓軌道收斂到目標號碼 */
export default function RouletteBall({
  size = 360,
  phase,
  result,
  onRevealEnd,
  ballOnly = true,
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
  const radius = Math.floor(size * 0.36);

  // 依照你的號碼順序去對應角度。這裡以 0 在 12 點，順時針每格 360/37
  const targetAngle = useMemo(() => {
    if (typeof result !== "number") return null;
    const step = 360 / 37;
    return (360 - result * step) % 360;
  }, [result]);

  useEffect(() => {
    if (phase === "BETTING") {
      stop();
      const tick = () => {
        setAngle((a) => (a + 1.2) % 360);
        reqRef.current = requestAnimationFrame(tick);
      };
      reqRef.current = requestAnimationFrame(tick);
      return stop;
    }

    if (phase === "REVEALING" && targetAngle != null) {
      stop();
      startRef.current = null;
      const DUR = 10000;
      const startAngle = angle;
      const diff = shortestDiff(startAngle, targetAngle);

      const tick = (t: number) => {
        if (startRef.current == null) startRef.current = t;
        const el = Math.min(1, (t - startRef.current) / DUR);
        const e = 1 - Math.pow(1 - el, 3);
        setAngle((startAngle + diff * e + 360) % 360);
        if (el < 1) reqRef.current = requestAnimationFrame(tick);
        else onRevealEnd?.();
      };
      reqRef.current = requestAnimationFrame(tick);
      return stop;
    }

    stop();
  }, [phase, targetAngle]); // eslint-disable-line

  function stop() {
    if (reqRef.current) cancelAnimationFrame(reqRef.current);
    reqRef.current = null;
  }

  return (
    <div
      className="roulette-ball"
      style={{
        position: ballOnly ? "absolute" : "relative",
        left: 0,
        top: 0,
        width: size,
        height: size,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
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

function shortestDiff(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}
