"use client";
import { useEffect, useRef } from "react";

export default function BankLottie() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let anim: any;
    (async () => {
      const lottie = await import("lottie-web"); // 動態載入避免 SSR 衝突
      if (!ref.current) return;
      anim = lottie.loadAnimation({
        container: ref.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: "/lottie/bank.json", // 把你的動畫放在 /public/lottie/bank.json
        rendererSettings: { progressiveLoad: true },
      });
    })();
    return () => {
      try { anim?.destroy?.(); } catch {}
    };
  }, []);

  return <div className="lb-bank__anim" ref={ref} aria-hidden />;
}
