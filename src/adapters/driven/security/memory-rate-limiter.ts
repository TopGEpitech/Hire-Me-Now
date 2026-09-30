import type { Clock, RateLimiter } from "@/core/application/ports";

// fixed window, in memory. good enough for 1 instance.
// behind a load balancer you'd plug a redis adapter in here, the core won't notice
export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly clock: Clock = Date.now,
  ) {}

  hit(key: string) {
    const now = this.clock();
    const current = this.windows.get(key);

    if (!current || current.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      if (this.windows.size > 10_000) this.sweep(now);
      return { allowed: true, retryAfterMs: 0 };
    }

    current.count++;
    return current.count <= this.limit
      ? { allowed: true, retryAfterMs: 0 }
      : { allowed: false, retryAfterMs: current.resetAt - now };
  }

  private sweep(now: number) {
    this.windows.forEach((w, k) => w.resetAt <= now && this.windows.delete(k));
  }
}
