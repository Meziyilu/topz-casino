"use client";
import dynamic from "next/dynamic";

// 用 dynamic 避免 SSR 找不到 window
export const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then((m) => m.Player),
  { ssr: false }
);
