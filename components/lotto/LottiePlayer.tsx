"use client";
import dynamic from "next/dynamic";

// 只在瀏覽器載入 Player，避免 SSR 時找不到 window
export const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then(m => m.Player),
  { ssr: false }
);
