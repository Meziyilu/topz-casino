"use client";
import { Player } from "@/components/lottie/LottiePlayer";

export default function LottoLottie({ size=190, speed=1 }: { size?: number; speed?: number }) {
  return (
    <div style={{ width: size, height: size }}>
      <Player
        autoplay
        loop
        src="/lottie/lotto.json"
        speed={speed}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
