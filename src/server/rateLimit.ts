// Best-effort in-memory per-IP token bucket for the public API routes (/api/og/*, /api/admin/*, /api/share/*).
// State lives in one server instance only: on Vercel every lambda has its own bucket, so this just blunts naive floods.
// Production: put a Vercel WAF / Cloudflare rate-limit rule in front (see README "Rate limiting").

export interface BucketOptions {
  /** burst size */
  capacity: number;
  /** tokens added per second */
  refillPerSec: number;
  /** hard cap on tracked keys (oldest dropped first) so a spoofed-IP flood cannot grow memory */
  maxKeys?: number;
}

export class TokenBuckets {
  private map = new Map<string, { tokens: number; at: number }>();
  constructor(private opts: BucketOptions) {}

  /** Takes one token. Returns false when the key is over its limit. */
  take(key: string, nowMs: number = Date.now()): boolean {
    const { capacity, refillPerSec } = this.opts;
    const prev = this.map.get(key);
    let tokens = prev ? Math.min(capacity, prev.tokens + ((nowMs - prev.at) / 1000) * refillPerSec) : capacity;
    this.map.delete(key); // re-insert to keep Map order = least recently used first
    const ok = tokens >= 1;
    if (ok) tokens -= 1;
    this.map.set(key, { tokens, at: nowMs });
    const max = this.opts.maxKeys ?? 5000;
    while (this.map.size > max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
    return ok;
  }

  /** Peeks without consuming (used to short-circuit after repeated failures). */
  has(key: string, nowMs: number = Date.now()): boolean {
    const prev = this.map.get(key);
    if (!prev) return true;
    return Math.min(this.opts.capacity, prev.tokens + ((nowMs - prev.at) / 1000) * this.opts.refillPerSec) >= 1;
  }
}

/** Client IP for rate limiting: platform-set headers first, then the right-most X-Forwarded-For entry (appended by our proxy). */
export function clientIp(headers: Headers): string {
  const direct = headers.get('x-vercel-forwarded-for') ?? headers.get('x-real-ip');
  if (direct) return direct.split(',')[0].trim();
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',').pop()!.trim();
  return 'unknown';
}

const og = new TokenBuckets({ capacity: 30, refillPerSec: 0.5 });
const adminAll = new TokenBuckets({ capacity: 30, refillPerSec: 0.5 });
const adminFail = new TokenBuckets({ capacity: 5, refillPerSec: 1 / 60 });
const share = new TokenBuckets({ capacity: 20, refillPerSec: 0.2 });

export const limits = {
  og: (ip: string) => og.take(ip),
  admin: (ip: string) => adminAll.take(ip),
  /** call after a failed admin authentication; false means the IP should now be blocked */
  adminFailure: (ip: string) => adminFail.take(ip),
  adminBlocked: (ip: string) => !adminFail.has(ip),
  share: (ip: string) => share.take(ip),
};

export const tooMany = () =>
  new Response(JSON.stringify({ error: 'RATE_LIMITED' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '30', 'Cache-Control': 'no-store' },
  });
