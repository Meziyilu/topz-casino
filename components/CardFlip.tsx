// components/CardFlip.tsx
"use client";

type Card = { rank: string; suit: "♠" | "♥" | "♦" | "♣" | string };

function pointOf(rank: string) {
  const r = rank.toUpperCase();
  if (r === "A") return 1;
  if (["10", "J", "Q", "K"].includes(r)) return 0;
  const n = parseInt(r, 10);
  return Number.isFinite(n) ? n : 0;
}
function suitColor(suit: string) {
  return suit === "♥" || suit === "♦" ? "#fecaca" : "#c7d2fe"; // 紅色花色/藍紫色
}

export default function CardFlip({
  title,
  cards = [],
  reveal = false,
  win = false,
}: {
  title: "閒" | "莊";
  cards?: Card[];
  reveal?: boolean;
  win?: boolean;
}) {
  const total =
    cards.reduce((acc, c) => acc + pointOf(c.rank), 0) % 10;

  return (
    <div className="flip-3d">
      <div
        className={`flip-inner ${reveal ? "animate-[flipIn_.8s_ease_forwards]" : ""}`}
        style={{ transform: reveal ? "rotateY(180deg)" : "none" }}
      >
        {/* 背面：未翻開 */}
        <div className="flip-front glass flex items-center justify-center rounded-2xl h-40">
          <div className="text-2xl font-bold opacity-80">?</div>
        </div>

        {/* 正面：翻開後 */}
        <div
          className={`flip-back rounded-2xl p-3 flex flex-col gap-3 ${
            win ? "shadow-[0_0_32px_rgba(255,215,0,.45)] ring-2 ring-yellow-400/70" : ""
          }`}
          style={{
            background:
              title === "閒"
                ? "linear-gradient(135deg, rgba(103,232,249,.16), rgba(255,255,255,.06))"
                : "linear-gradient(135deg, rgba(253,164,175,.16), rgba(255,255,255,.06))",
            border:
              title === "閒"
                ? "1px solid rgba(103,232,249,.45)"
                : "1px solid rgba(253,164,175,.45)",
          }}
        >
          {/* 手牌列（最多 3 張） */}
          <div className="flex items-center gap-3 justify-center">
            {cards.slice(0, 3).map((c, i) => (
              <div
                key={i}
                className="relative w-16 h-24 rounded-xl bg-white/90 text-black shadow-lg"
                style={{
                  transform:
                    i === 1 ? "rotate(2deg)" : i === 2 ? "rotate(-3deg)" : "rotate(-1deg)",
                }}
              >
                {/* 角標 */}
                <div className="absolute top-1 left-1 text-xs font-bold leading-none">
                  <div>{c.rank}</div>
                  <div style={{ color: suitColor(c.suit) }}>{c.suit}</div>
                </div>
                {/* 中央大字 */}
                <div
                  className="absolute inset-0 flex items-center justify-center font-extrabold"
                  style={{ color: suitColor(c.suit), fontSize: 26 }}
                >
                  {c.rank}
                </div>
                {/* 右下角標 */}
                <div className="absolute bottom-1 right-1 text-xs font-bold leading-none rotate-180">
                  <div>{c.rank}</div>
                  <div style={{ color: suitColor(c.suit) }}>{c.suit}</div>
                </div>
              </div>
            ))}
            {cards.length === 0 && (
              <div className="text-white/70">（無牌）</div>
            )}
          </div>

          {/* 合計點數 */}
          <div className="text-center text-lg font-extrabold">
            合計：<span className="text-white">{total}</span> 點
          </div>
        </div>
      </div>
    </div>
  );
}
