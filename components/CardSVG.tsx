// components/CardSVG.tsx
// 純前端元件：把 {rank,suit} 或 "Q♥" 之類卡面，畫成 SVG 撲克牌
// 不用 hooks；可直接在 Server/Client 端引入

type Suit = "♠" | "♥" | "♦" | "♣";
type Parts = { rank: string; suit: Suit; color: string };

function toParts(raw: any): Parts {
  // 1) 先把輸入轉成字串或物件
  let r: any = null;
  let s: any = null;

  if (typeof raw === "string") {
    // 可能像 "10♥" 或 "Q♣"
    const m = raw.match(/^([0-9AJQK]+)\s*([♠♥♦♣SHDCshdc])$/);
    if (m) {
      r = m[1];
      s = m[2];
    } else {
      // 粗略拆法：最後一個字元當花色
      r = raw.slice(0, raw.length - 1);
      s = raw.slice(-1);
    }
  } else if (raw && typeof raw === "object") {
    r = raw.rank ?? raw.value ?? "?";
    s = raw.suit ?? raw.s ?? "?";
  }

  // 2) rank 正規化
  const rankMap: Record<string, string> = {
    "1": "A",
    "11": "J",
    "12": "Q",
    "13": "K",
    a: "A",
    j: "J",
    q: "Q",
    k: "K",
  };
  const rank =
    typeof r === "number"
      ? rankMap[String(r)] ?? String(r)
      : rankMap[String(r).toLowerCase()] ?? String(r).toUpperCase();

  // 3) suit 轉成符號
  const suitMap: Record<string, Suit> = {
    S: "♠",
    s: "♠",
    SPADES: "♠",
    SPADE: "♠",
    H: "♥",
    h: "♥",
    HEARTS: "♥",
    HEART: "♥",
    D: "♦",
    d: "♦",
    DIAMONDS: "♦",
    DIAMOND: "♦",
    C: "♣",
    c: "♣",
    CLUBS: "♣",
    CLUB: "♣",
    "♠": "♠",
    "♥": "♥",
    "♦": "♦",
    "♣": "♣",
  };
  const suit = suitMap[String(s)] ?? ("■" as Suit);

  const color =
    suit === "♥" || suit === "♦"
      ? "#ef4444" // red-500
      : "#60a5fa"; // blue-400（看起來酷一點）

  return { rank, suit, color };
}

export default function CardSVG({
  card,
  width = 56, // 對應 w-14
  height = 80, // 對應 h-20
}: {
  card: any;
  width?: number;
  height?: number;
}) {
  const { rank, suit, color } = toParts(card);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 56 80"
      role="img"
      aria-label={`${rank}${suit}`}
    >
      {/* 背板 */}
      <defs>
        <linearGradient id="card-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopOpacity="0.18" stopColor="#ffffff" />
          <stop offset="1" stopOpacity="0.08" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <rect
        x="1.5"
        y="1.5"
        rx="8"
        ry="8"
        width="53"
        height="77"
        fill="url(#card-bg)"
        stroke="rgba(255,255,255,.35)"
      />
      {/* 左上 rank/suit */}
      <text
        x="6.5"
        y="15"
        fontSize="12"
        fontWeight="700"
        fill={color}
        fontFamily="ui-sans-serif, system-ui, -apple-system"
      >
        {rank}
      </text>
      <text x="7" y="27" fontSize="12" fill={color}>
        {suit}
      </text>
      {/* 右下 rank/suit（倒過來擺） */}
      <g transform="rotate(180 28 40)">
        <text
          x="6.5"
          y="15"
          fontSize="12"
          fontWeight="700"
          fill={color}
          fontFamily="ui-sans-serif, system-ui, -apple-system"
        >
          {rank}
        </text>
        <text x="7" y="27" fontSize="12" fill={color}>
          {suit}
        </text>
      </g>
      {/* 中央大花色 */}
      <text x="50%" y="52%" textAnchor="middle" fontSize="28" fill={color}>
        {suit}
      </text>
    </svg>
  );
}
