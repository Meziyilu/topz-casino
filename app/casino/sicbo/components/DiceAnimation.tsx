"use client";

export default function DiceAnimation({ dice }: { dice: [number, number, number] | null }) {
  return (
    <div className="glass p-3 rounded-lg flex items-center justify-center gap-3">
      {[0, 1, 2].map((i) => {
        const v = dice ? dice[i] : 1;
        return (
          <div
            key={i}
            className={`flex items-center justify-center font-bold glass ${dice ? "" : "dice-shake"}`}
            style={{ width: 48, height: 48, borderRadius: 12, fontSize: 24 }}
          >
            {v}
          </div>
        );
      })}
    </div>
  );
}
