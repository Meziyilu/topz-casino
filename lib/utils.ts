// ==============================
// file: lib/utils.ts
// ==============================
export function invariant(condition: unknown, message = "Invariant failed"): asserts condition {
if (!condition) throw new Error(message);
}


export function clamp(n: number, min: number, max: number): number {
return Math.max(min, Math.min(max, n));
}


export function toInt(n: number | string): number {
const v = typeof n === "string" ? Number(n) : n;
if (!Number.isFinite(v)) throw new Error(`toInt: invalid number: ${n}`);
return Math.trunc(v);
}


export function sleep(ms: number): Promise<void> {
return new Promise((res) => setTimeout(res, ms));
}


export function nowTs(): number { return Date.now(); }


export function uid(prefix = "id"): string {
return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}


export function formatCurrency(n: number): string {
return new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(n);
}


export function pick<T, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
const out = {} as Pick<T, K>;
for (const k of keys) out[k] = obj[k];
return out;
}


export function assertNever(x: never): never {
throw new Error(`Unexpected value: ${String(x)}`);
}