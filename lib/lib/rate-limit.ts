type Bucket = { tokens: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, capacity: number, windowMs: number) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt < now) {
    b = { tokens: capacity, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  if (b.tokens <= 0) return false;
  b.tokens -= 1;
  return true;
}
