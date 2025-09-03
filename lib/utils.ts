export function now() { return new Date(); }
export const ok = (data: any, init?: number) => Response.json(data, { status: init ?? 200 });
export const err = (msg: string, code=400) => Response.json({ error: msg }, { status: code });

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}