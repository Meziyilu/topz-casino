/** Minimal lotto view helpers to satisfy imports */
export type LottoNumber = number;
export type LottoView = {
  numbers: LottoNumber[];
  special?: LottoNumber | null;
  drawAt?: string;
};

export function toView(input: any): LottoView {
  return {
    numbers: Array.isArray(input?.numbers) ? input.numbers : [],
    special: input?.special ?? null,
    drawAt: input?.drawAt ?? undefined,
  };
}

export function formatView(v: LottoView): string {
  const base = v.numbers.join(", ");
  return v.special == null ? base : `${base} | S:${v.special}`;
}
