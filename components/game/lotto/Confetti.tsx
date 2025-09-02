"use client";
import { useEffect, useRef } from "react";
export default function Confetti({ fire }: { fire: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!fire || !ref.current) return;
    const root = ref.current;
    const colors = ["#f97316", "#22c55e", "#06b6d4", "#a78bfa", "#f43f5e", "#eab308"];
    const pieces = 80;
    for (let i = 0; i < pieces; i += 1) {
      const el = document.createElement("i");
      el.style.left = `${Math.random() * 100}%`;
      el.style.background = colors[i % colors.length];
      el.style.transform = `translateY(-20vh) rotate(${Math.random() * 360}deg)`;
      el.style.animationDelay = `${Math.random() * 200}ms`;
      el.className = "animate-confetti";
      root.appendChild(el);
      setTimeout(() => { el.remove(); }, 2000);
    }
  }, [fire]);
  return <div ref={ref} className="confetti"></div>;
}
