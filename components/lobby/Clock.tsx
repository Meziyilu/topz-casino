"use client";
import { useEffect, useState } from "react";

export default function Clock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("zh-TW", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }
    tick(); // 立刻顯示一次
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // 用 suppressHydrationWarning 避免 SSR/CSR 初始內容不一致的警告
  return <div suppressHydrationWarning>{time || "--:--:--"}</div>;
}
