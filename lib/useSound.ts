// lib/useSound.ts
import { useMemo } from "react";

export function useSound(src: string, volume: number = 1) {
  const audio = useMemo(() => {
    if (typeof Audio !== "undefined") {
      const a = new Audio(src);
      a.volume = volume;
      return a;
    }
    return null;
  }, [src, volume]);

  const play = () => {
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  return play;
}
