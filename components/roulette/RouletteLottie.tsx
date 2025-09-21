"use client";
import { useEffect, useRef } from "react";
import lottie from "lottie-web";

export default function RouletteLottie({
  size = 140,
  speed = 1,
  className = "",
  path = "/lottie/roulette.json", // 你說的路徑
}: { size?: number; speed?: number; className?: string; path?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const anim = lottie.loadAnimation({
      container: ref.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path,
    });
    anim.setSpeed(speed);
    return () => anim.destroy();
  }, [path, speed]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: size, height: size, pointerEvents: "none" }}
      aria-hidden
    />
  );
}
