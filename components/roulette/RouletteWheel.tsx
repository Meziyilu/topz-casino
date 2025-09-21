"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Phase = "BETTING" | "REVEALING" | "SETTLED";

/** 輪盤「盤面」：REVEALING 會做 10s 旋轉，平時可微慢轉 */
export default function RouletteWheel({
  size = 320,
  phase,
  result,
  spinMs = 10000,
  idleSpeed = 0, // 0=不轉；給 5~15 會很淡
}: {
  size?: number;
  phase: Phase;
  result: number | null | undefined;
  spinMs?: number;
  idleSpeed?: number;
}) {
  const [deg, setDeg] = useState(0);
  const req = useRef<number | null>(null);
  const start = useRef<number | null>(null);
  const idleReq = useRef<number | null>(null);

  useEffect(() => {
    // idle 小幅度慢轉
    stopIdle();
    if (idleSpeed > 0 && phase !== "REVEALING") {
      const tick = () => {
        setDeg((d) => (d + idleSpeed * 0.05) % 360);
        idleReq.current = requestAnimationFrame(tick);
      };
      idleReq.current = requestAnimationFrame(tick);
    }
    return stopIdle;
  }, [phase, idleSpeed]);

  useEffect(() => {
    if (phase !== "REVEALING") {
      // 停止動畫，角度保留
      if (req.current) cancelAnimationFrame(req.current);
      req.current = null;
      start.current = null;
      return;
    }

    // 10 秒轉動，ease-out
    if (req.current) cancelAnimationFrame(req.current);
    start.current = null;
    const from = deg;
    const rounds = 12 * 360; // 多轉幾圈
    const to = from + rounds;

    const tick = (t: number) => {
      if (start.current == null) start.current = t;
      const el = Math.min(1, (t - start.current) / spinMs);
      const e = 1 - Math.pow(1 - el, 3);
      setDeg(from + (to - from) * e);

      if (el < 1) {
        req.current = requestAnimationFrame(tick);
      } else {
        req.current = null;
        start.current = null;
      }
    };
    req.current = requestAnimationFrame(tick);

    return () => {
      if (req.current) cancelAnimationFrame(req.current);
      req.current = null;
      start.current = null;
    };
  }, [phase]); // eslint-disable-line

  function stopIdle() {
    if (idleReq.current) cancelAnimationFrame(idleReq.current);
    idleReq.current = null;
  }

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        margin: "0 auto",
        transform: `rotate(${deg}deg)`,
        transition: phase === "REVEALING" ? "none" : "transform 80ms linear",
        filter: "drop-shadow(0 6px 18px rgba(0,0,0,.45))",
      }}
    >
      <Image
        src="/ui/roulette/wheel.png"
        alt="wheel"
        width={size}
        height={size}
        priority
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    </div>
  );
}
