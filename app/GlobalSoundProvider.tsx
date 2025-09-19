"use client";

import { useEffect } from "react";

export default function GlobalSoundProvider() {
  useEffect(() => {
    const clickAudio = new Audio("/sounds/click.mp3");
    clickAudio.volume = 0.5;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.hasAttribute("data-sound")) {
        const sfx = clickAudio.cloneNode() as HTMLAudioElement;
        sfx.play().catch(() => {});
      }
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return null; // 不渲染任何東西
}
