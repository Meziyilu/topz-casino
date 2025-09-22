"use client";

import { useEffect, useRef } from "react";
import type { AnimationItem } from "lottie-web";

export default function LottiePlayer({
  path,
  loop = false,
  autoplay = false,
  className,
  speed = 1,
}: {
  path: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const lottie = (await import("lottie-web")).default;

        // 先抓 JSON，路徑錯誤會有清楚的錯誤訊息
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok) throw new Error(`Lottie fetch ${res.status} ${res.statusText} for ${path}`);
        const animationData = await res.json();

        if (!ref.current || !mounted) return;
        const anim = lottie.loadAnimation({
          container: ref.current,
          renderer: "svg",
          loop,
          autoplay,
          animationData,
        });
        anim.setSpeed(speed);
        animRef.current = anim;
      } catch (e) {
        console.error("[Lottie] load failed:", e);
      }
    })();

    return () => {
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, [path, loop, autoplay, speed]);

  return <div ref={ref} className={className} />;
}
