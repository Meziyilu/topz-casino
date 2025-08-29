// components/FlipTile.tsx
"use client";

export default function FlipTile({
  label,
  value,
  flipped,
}: {
  label: string;
  value: string | number;
  flipped: boolean;
}) {
  return (
    <div className="flip-3d w-24 h-32">
      <div
        className="flip-inner"
        style={{ transform: `rotateY(${flipped ? 180 : 0}deg)` }}
      >
        <div className="flip-front glass flex items-center justify-center text-3xl font-bold">
          ?
        </div>
        <div className="flip-back glass flex flex-col items-center justify-center">
          <div className="text-xs text-white/70 mb-1">{label}</div>
          <div className="text-3xl font-extrabold">{value}</div>
        </div>
      </div>
    </div>
  );
}
