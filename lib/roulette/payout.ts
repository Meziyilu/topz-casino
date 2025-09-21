import type { RouletteBetKind } from "@prisma/client";
import { isRed, isBlack, isOdd, isEven, isLow, isHigh, dozenIndex, columnIndex } from "./map";

// 派彩倍數（含原注退回）：這裡回傳「淨贏利 = 下注 * 倍數」
export const MULTIPLIER: Record<RouletteBetKind, number> = {
  STRAIGHT: 35,
  SPLIT: 17,
  STREET: 11,
  CORNER: 8,
  LINE: 5,
  DOZEN: 2,
  COLUMN: 2,
  RED_BLACK: 1,
  ODD_EVEN: 1,
  LOW_HIGH: 1,
};

// 檢查是否中獎（payload 形狀：見下注 API）
export function isWinning(kind: RouletteBetKind, payload: any, result: number): boolean {
  if (result === 0) {
    // 只有 STRAIGHT(0) 會中，其餘都不中
    if (kind === "STRAIGHT" && Array.isArray(payload?.numbers))
      return payload.numbers.length===1 && payload.numbers[0] === 0;
    return false;
  }

  switch (kind) {
    case "STRAIGHT":
      return Array.isArray(payload?.numbers) && payload.numbers.length===1 && payload.numbers[0] === result;

    case "SPLIT":
      return Array.isArray(payload?.numbers) && payload.numbers.length===2 && payload.numbers.includes(result);

    case "STREET":
      return Array.isArray(payload?.numbers) && payload.numbers.length===3 && payload.numbers.includes(result);

    case "CORNER":
      return Array.isArray(payload?.numbers) && payload.numbers.length===4 && payload.numbers.includes(result);

    case "LINE":
      return Array.isArray(payload?.numbers) && payload.numbers.length===6 && payload.numbers.includes(result);

    case "DOZEN": {
      const d = dozenIndex(result); // 0,1,2
      return typeof payload?.dozen === "number" && payload.dozen === d;
    }

    case "COLUMN": {
      const c = columnIndex(result); // 0,1,2
      return typeof payload?.column === "number" && payload.column === c;
    }

    case "RED_BLACK":
      if (payload?.color === "RED") return isRed(result as any);
      if (payload?.color === "BLACK") return isBlack(result as any);
      return false;

    case "ODD_EVEN":
      if (payload?.parity === "ODD") return isOdd(result as any);
      if (payload?.parity === "EVEN") return isEven(result as any);
      return false;

    case "LOW_HIGH":
      if (payload?.range === "LOW") return isLow(result as any);
      if (payload?.range === "HIGH") return isHigh(result as any);
      return false;
  }
}
