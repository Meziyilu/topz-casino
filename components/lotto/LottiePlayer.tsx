"use client";
import { Player } from "@lottiefiles/react-lottie-player";

type Props = {
  src: string;
  size?: number;
  speed?: number;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
};

export default function LottiePlayer({
  src,
  size = 190,
  speed = 1,
  loop = true,
  autoplay = true,
  className,
}: Props) {
  return (
    <Player
      autoplay={autoplay}
      loop={loop}
      src={src}
      speed={speed}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
