// ==============================
// file: lib/validation.ts
// ==============================
import { z } from "zod";


export const idCuid = z.string().min(10);
export const positiveInt = z.number().int().nonnegative();
export const moneyInt = z.number().int(); // 可為正負，單位以元


export function safeParse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> | null {
const r = schema.safeParse(data);
return r.success ? (r.data as z.infer<T>) : null;
}


export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown, msg = "Invalid payload"): z.infer<T> {
const r = schema.safeParse(data);
if (!r.success) throw new Error(`${msg}: ${r.error.message}`);
return r.data as z.infer<T>;
}