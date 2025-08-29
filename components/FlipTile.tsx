"use client";

type Outcome = "PLAYER" | "BANKER" | "TIE" | null;

export default function FlipTile({
  label,
  value,
  outcome,
}: {
  label: "PLAYER" | "BANKER";
  value: number | null;
  outcome?: Outcome; // 可選，避免型別報錯
}) {
  const isWinner =
    outcome ? (label === outcome ? true : false) : false;

  return (
    <div className="flip-3d w-40 h-56">
      <div className={`flip-inner ${outcome ? "animate-flip" : ""}`}>
        {/* front */}
        <div className="flip-front glass flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs tracking-widest opacity-75">{label}</div>
            <div className="text-4xl font-bold mt-2">{value ?? "?"}</div>
          </div>
        </div>
        {/* back */}
        <div className="flip-back glass flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs tracking-widest opacity-75">{label}</div>
            <div className={`text-4xl font-bold mt-2 ${isWinner ? "text-emerald-300" : ""}`}>
              {value ?? "?"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
