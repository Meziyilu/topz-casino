"use client";
import Image from "next/image";

export default function RouletteWheel({
  size = 360,
  result,
  phase,
}: {
  size?: number;
  result?: number | null;
  phase: "BETTING" | "REVEALING" | "SETTLED";
}) {
  return (
    <div
      className="roulette-wheel"
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "grid",
        placeItems: "center",
      }}
    >
      <Image
        src="/images/roulette-wheel.png"
        alt="Roulette Wheel"
        width={size}
        height={size}
        priority
        style={{ objectFit: "contain", pointerEvents: "none" }}
      />
      <style jsx>{`
        .roulette-wheel {
          filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.35));
        }
      `}</style>
    </div>
  );
}
