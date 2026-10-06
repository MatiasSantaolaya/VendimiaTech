export interface RateLimiter {
  hit(key: string, limit: number, windowMs: number): Promise<{ ok: boolean; remaining: number }>;
}

export class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, number[]>();
  async hit(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const prev = (this.buckets.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
    if (prev.length >= limit) {
      this.buckets.set(key, prev);
      return { ok: false, remaining: 0 };
    }
    prev.push(now);
    this.buckets.set(key, prev);
    return { ok: true, remaining: limit - prev.length };
  }
}

/** Real adapter. Inactive until UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set outside the required contract. */
export class UpstashRateLimiter implements RateLimiter {
  constructor(private readonly url: string, private readonly token: string) {
    if (!url || !token) throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required");
  }
  async hit(key: string, limit: number, windowMs: number) {
    const response = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, String(windowMs), "NX"],
      ]),
    });
    if (!response.ok) throw new Error(`RATE_LIMIT_ERROR_${response.status}`);
    const data = (await response.json()) as { result?: number }[];
    const count = Number(data?.[0]?.result ?? limit);
    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  }
}

export function createRateLimiter(): RateLimiter {
  if (process.env.RATE_LIMIT_DRIVER === "upstash") {
    return new UpstashRateLimiter(process.env.UPSTASH_REDIS_REST_URL ?? "", process.env.UPSTASH_REDIS_REST_TOKEN ?? "");
  }
  return new MemoryRateLimiter();
}
