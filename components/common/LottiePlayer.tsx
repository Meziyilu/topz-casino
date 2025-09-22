"use client";

import { useEffect, useRef } from "react";
import type { AnimationItem } from "lottie-web";

export default function LottiePlayer({
  path,
  loop = false,
  autoplay = false,
  className,
  onComplete,
  speed = 1,
}: {
  path: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  speed?: number;
  onComplete?: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const lottie = (await import("lottie-web")).default;
      if (!ref.current || !mounted) return;
      const anim = lottie.loadAnimation({
        container: ref.current,
        renderer: "svg",
        loop,
        autoplay,
        path,
      });
      anim.setSpeed(speed);
      animRef.current = anim;
      if (onComplete) anim.addEventListener("complete", onComplete);
    })();

    return () => {
      mounted = false;
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, [path, loop, autoplay, speed, onComplete]);

  return <div ref={ref} className={className} />;
}
