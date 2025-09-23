// lib/datetime.ts
export function parseLocalDateTime(v?: string | null) {
  if (!v) return null;
  // v: "2025-09-24T23:00"
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
