"use client";

export default function DiceAnimation({
  dice,
  size = 48,
}: {
  dice: [number, number, number] | null;
  size?: number;
}) {
  return (
    <div className="glass p-3 rounded-lg flex items-center justify-center gap-3">
      {[0, 1, 2].map((i) => {
        const v = dice ? dice[i] : 1;
        return (
          <div
            key={i}
            className={`flex items-center justify-center font-bold glass ${
              dice ? "" : "dice-shake"
            }`}
            style={{
              width: size,
              height: size,
              borderRadius: 12,
              fontSize: Math.round(size * 0.5),
            }}
            title={dice ? `骰子${i + 1}: ${v}` : "搖骰中…"}
          >
            {v}
          </div>
        );
      })}
    </div>
  );
}
