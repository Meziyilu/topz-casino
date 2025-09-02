"use client";
type Props = { num: number; reveal?: boolean; delay?: number; bigThreshold: number; };
export default function LottoBall({ num, reveal = true, delay = 0, bigThreshold }: Props) {
  const isBig = num >= bigThreshold;
  const even = num % 2 === 0;
  return (
    <div
      className={[
        "w-12 h-12 md:w-14 md:h-14 rounded-full grid place-items-center text-lg font-bold",
        "bg-gradient-to-br from-white to-white/90 text-gray-900 border border-black/10 ball-glow",
        reveal ? "animate-flip" : "opacity-70",
        isBig ? "ring-2 ring-primary/70" : "ring-2 ring-white/40",
      ].join(" ")}
      style={{ animationDelay: `${delay}ms` }}
      aria-label={`ball-${num}`}
      title={`${num}（${isBig ? "大" : "小"} / ${even ? "雙" : "單"}）`}
    >
      {num}
    </div>
  );
}
