// lib/lottoView.ts
import type { Prisma } from "@prisma/client";

/**
 * 統一給 Admin/前端用的 Round View
 * 不再用 discriminated union（字面量型別），
 * status 就是 Prisma Enum，其他欄位允許 null/[]。
 */
export type AdminRoundView = {
  id: string;
  code: number;
  status: Prisma.$Enums.LottoRoundStatus; // "OPEN" | "LOCKED" | "DRAWN" | "SETTLED"
  drawAt: string | null;                  // Date 轉成 ISO string
  numbers: number[];                      // 沒有就 []
  special: number | null;                 // 沒有就 null
  jackpot: number | null;                 // 沒有就 null
};

/** Prisma → AdminRoundView */
export function toAdminRoundView(r: {
  id: string;
  code: number;
  status: Prisma.$Enums.LottoRoundStatus;
  drawAt?: Date | null;
  numbers?: number[] | null;
  special?: number | null;
  jackpot?: number | null;
}): AdminRoundView {
  return {
    id: r.id,
    code: r.code,
    status: r.status,
    drawAt: r.drawAt ? r.drawAt.toISOString() : null,
    numbers: r.numbers ?? [],
    special: r.special ?? null,
    jackpot: r.jackpot ?? null,
  };
}
