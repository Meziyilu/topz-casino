"use client";

import { useMemo, useState } from "react";

/** 注型 enum（對齊你的 Prisma） */
type Kind =
  | "RED_BLACK" | "ODD_EVEN" | "LOW_HIGH"
  | "DOZEN" | "COLUMN"
  | "STRAIGHT";

/** 傳回去的 payload 型別 */
type Payload =
  | { color?: "RED" | "BLACK" }
  | { parity?: "ODD" | "EVEN" }
  | { range?: "LOW" | "HIGH" }
  | { dozen?: 0 | 1 | 2 }
  | { column?: 0 | 1 | 2 }
  | { number?: number };

export default function BetPanel({
  onBet,                       // (kind, payload, amount) => void
  disabled = false,
}: {
  onBet: (kind: Kind, payload: Payload, amount: number) => void;
  disabled?: boolean;
}) {
  /** 晶片面額（可依喜好調整） */
  const chips = [10, 50, 100, 500, 1000];
  const [chip, setChip] = useState(50);

  // 歐輪紅號（方便渲染數字顏色）
  const redSet = useMemo(() => new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]), []);

  function place(kind: Kind, payload: Payload) {
    if (disabled) return;
    onBet(kind, payload, chip);
  }

  return (
    <div className="rp">
      <div className="rp-head">
        <div className="rp-title">快速下注</div>
        <div className="rp-sub">面額：{chip}</div>
      </div>

      {/* 晶片選擇 */}
      <div className="rp-chips">
        {chips.map(v => (
          <button
            key={v}
            className="rp-chip"
            data-active={chip === v ? 1 : 0}
            onClick={() => setChip(v)}
          >
            <span>紅 {v}</span>
            <small>CHIP</small>
          </button>
        ))}
      </div>

      {/* 常用玩法：紅/黑、單/雙、小/大 */}
      <div className="rp-section">
        <div className="sec-title">常用玩法</div>
        <div className="rp-grid2">
          <button className="rp-btn" data-kind="RED" onClick={() => place("RED_BLACK", { color: "RED" })}>紅</button>
          <button className="rp-btn" data-kind="BLACK" onClick={() => place("RED_BLACK", { color: "BLACK" })}>黑</button>

          <button className="rp-btn" onClick={() => place("ODD_EVEN", { parity: "ODD" })}>單</button>
          <button className="rp-btn" onClick={() => place("ODD_EVEN", { parity: "EVEN" })}>雙</button>

          <button className="rp-btn" onClick={() => place("LOW_HIGH", { range: "LOW" })}>小(1–18)</button>
          <button className="rp-btn" onClick={() => place("LOW_HIGH", { range: "HIGH" })}>大(19–36)</button>
        </div>
      </div>

      {/* 打 / 列 */}
      <div className="rp-section">
        <div className="sec-title">打 / 列</div>
        <div className="rp-grid3">
          <button className="rp-btn" onClick={() => place("DOZEN", { dozen: 0 })}>第1打</button>
          <button className="rp-btn" onClick={() => place("DOZEN", { dozen: 1 })}>第2打</button>
          <button className="rp-btn" onClick={() => place("DOZEN", { dozen: 2 })}>第3打</button>

          <button className="rp-btn" onClick={() => place("COLUMN", { column: 0 })}>第1列</button>
          <button className="rp-btn" onClick={() => place("COLUMN", { column: 1 })}>第2列</button>
          <button className="rp-btn" onClick={() => place("COLUMN", { column: 2 })}>第3列</button>
        </div>
      </div>

      {/* 直注（單號） */}
      <div className="rp-section">
        <div className="sec-title">直注（單號）</div>
        <div className="rp-numbers">
          {/* 0 */}
          <button className="rp-num" data-zero={1} onClick={() => place("STRAIGHT", { number: 0 })}>0</button>
          {/* 1~36 */}
          {Array.from({ length: 36 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              className="rp-num"
              data-red={redSet.has(n) ? 1 : 0}
              data-black={!redSet.has(n) ? 1 : 0}
              onClick={() => place("STRAIGHT", { number: n })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="rp-tip">提示：點選晶片調整一次下注面額，按任一區塊立即下單。</div>
    </div>
  );
}
