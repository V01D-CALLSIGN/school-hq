import { HttpError } from "./errors";

const buckets = new Map<string, number[]>();
let lastSweep = 0;

function sweepExpiredBuckets(now: number): void {
  if (now - lastSweep < 60_000) return;
  const cutoff = now - 60_000;
  for (const [key, stamps] of buckets) {
    const recent = stamps.filter((stamp) => stamp > cutoff);
    if (recent.length) buckets.set(key, recent);
    else buckets.delete(key);
  }
  lastSweep = now;
}

export function enforceRateLimit(key: string, limit: number, now = Date.now()): void {
  sweepExpiredBuckets(now);
  const cutoff = now - 60_000;
  const recent = (buckets.get(key) ?? []).filter((stamp) => stamp > cutoff);
  if (recent.length >= limit) throw new HttpError(429, "RATE_LIMITED", "Too many requests; retry in one minute");
  recent.push(now);
  buckets.set(key, recent);
}

export function resetRateLimitsForTests(): void {
  buckets.clear();
  lastSweep = 0;
}
