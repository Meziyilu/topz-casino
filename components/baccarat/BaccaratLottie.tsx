// components/baccarat/BaccaratLottie.tsx
"use client";
import { Player } from "@lottiefiles/react-lottie-player";

export default function BaccaratLottie({ size = 160, speed = 1 }) {
  return (
    <Player
      autoplay
      loop
      speed={speed}
      src="/lottie/baccarat.json"
      style={{ width: size, height: size }}
    />
  );
}
