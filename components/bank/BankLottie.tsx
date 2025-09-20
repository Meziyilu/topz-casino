"use client";
import { useEffect, useRef } from "react";
import type { AnimationItem } from "lottie-web";

export default function BankLottie() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let anim: AnimationItem | undefined;

    (async () => {
      // 重要：取得 default 才有 loadAnimation
      const lottie = (await import("lottie-web")).default;
      if (!ref.current) return;

      anim = lottie.loadAnimation({
        container: ref.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: "/lottie/bank.json",
        rendererSettings: { progressiveLoad: true },
      });
    })();

    return () => {
      try { anim?.destroy(); } catch {}
    };
  }, []);

  return <div className="lb-bank__anim" ref={ref} aria-hidden />;
}
