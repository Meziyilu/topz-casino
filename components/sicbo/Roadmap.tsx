// components/sicbo/SicboLottie.tsx
"use client";
import { Player } from "@lottiefiles/react-lottie-player";

export default function SicboLottie({ size = 160, speed = 1 }) {
  return (
    <Player
      autoplay
      loop
      speed={speed}
      src="/lottie/sicbo.json"
      style={{ width: size, height: size }}
    />
  );
}
