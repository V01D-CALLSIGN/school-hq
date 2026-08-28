import { HttpError } from "./errors";

const buckets = new Map<string, number[]>();

export function enforceRateLimit(key: string, limit: number, now = Date.now()): void {
  const cutoff = now - 60_000;
  const recent = (buckets.get(key) ?? []).filter((stamp) => stamp > cutoff);
  if (recent.length >= limit) throw new HttpError(429, "RATE_LIMITED", "Too many requests; retry in one minute");
  recent.push(now);
  buckets.set(key, recent);
}

export function resetRateLimitsForTests(): void {
  buckets.clear();
}
