// components/lotto/LottoLottie.tsx
"use client";
import { Player } from "@lottiefiles/react-lottie-player";

export default function LottoLottie({ size = 160, speed = 1 }) {
  return (
    <Player
      autoplay
      loop
      speed={speed}
      src="/lottie/lotto.json"
      style={{ width: size, height: size }}
    />
  );
}
