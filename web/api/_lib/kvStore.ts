/**
 * Tiny durable key-value primitive for the LTI endpoints.
 *
 * Two operations, both with a TTL:
 *   - `incrWithTtl` — atomic counter for fixed-window rate limiting.
 *   - `claimOnce`   — atomic set-if-absent, the primitive behind single-use
 *                     nonce enforcement (returns true only the first time).
 *
 * Backend selection is by environment, with zero new npm deps:
 *   - If a Vercel KV / Upstash Redis REST endpoint is configured
 *     (`KV_REST_API_URL` + `KV_REST_API_TOKEN`, or the `UPSTASH_REDIS_REST_*`
 *     equivalents), state is shared across all serverless instances — a real
 *     global quota and a real cross-instance nonce store.
 *   - Otherwise it falls back to a per-instance in-memory map: best-effort,
 *     exactly the previous behaviour. A KV outage also transparently falls
 *     back to in-memory rather than failing launches.
 */

interface RestConfig {
  url: string;
  token: string;
}

function restConfig(): RestConfig | null {
  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
  if (url && token) return { url: url.replace(/\/$/, ''), token };
  return null;
}

/** Run one Upstash-style Redis REST command, returning the `result` field. */
async function redis(cfg: RestConfig, command: (string | number)[]): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2_000);
  try {
    const resp = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`KV ${resp.status}`);
    const data = (await resp.json()) as { result?: unknown; error?: string };
    if (data.error) throw new Error(data.error);
    return data.result ?? null;
  } finally {
    clearTimeout(timer);
  }
}

// ── In-memory fallback ──────────────────────────────────────────────────────

interface Entry {
  value: number;
  expires: number;
}
const mem = new Map<string, Entry>();

function memGc(now: number) {
  if (mem.size <= 5000) return;
  for (const [k, e] of mem) if (e.expires <= now) mem.delete(k);
}

function memIncr(key: string, ttlMs: number): number {
  const now = Date.now();
  memGc(now);
  const e = mem.get(key);
  if (!e || e.expires <= now) {
    mem.set(key, { value: 1, expires: now + ttlMs });
    return 1;
  }
  e.value++;
  return e.value;
}

function memClaim(key: string, ttlMs: number): boolean {
  const now = Date.now();
  memGc(now);
  const e = mem.get(key);
  if (e && e.expires > now) return false;
  mem.set(key, { value: 1, expires: now + ttlMs });
  return true;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Increment `key`, setting its TTL on first touch, and return the new count.
 * Backed by KV when configured; on any KV error it falls back to the
 * in-memory counter so rate limiting degrades to best-effort rather than
 * erroring the request.
 */
export async function incrWithTtl(key: string, ttlMs: number): Promise<number> {
  const cfg = restConfig();
  if (cfg) {
    try {
      const count = Number(await redis(cfg, ['INCR', key]));
      // Set the window TTL only when we created the key (count === 1).
      if (count === 1) await redis(cfg, ['PEXPIRE', key, ttlMs]);
      return count;
    } catch {
      /* fall through to in-memory */
    }
  }
  return memIncr(key, ttlMs);
}

/**
 * Atomically claim `key` for `ttlMs`. Returns true only the first time (the
 * key did not already exist), false on any subsequent call within the TTL —
 * exactly what single-use nonce enforcement needs.
 *
 * On a KV error this falls back to the in-memory claim. That means a KV
 * outage weakens replay protection to per-instance (best-effort) rather than
 * failing legitimate launches — a deliberate availability-over-strictness
 * choice for a roster-import convenience endpoint.
 */
export async function claimOnce(key: string, ttlMs: number): Promise<boolean> {
  const cfg = restConfig();
  if (cfg) {
    try {
      // SET key 1 NX PX ttl → "OK" when newly set, null when it already exists.
      const result = await redis(cfg, ['SET', key, '1', 'NX', 'PX', ttlMs]);
      return result === 'OK';
    } catch {
      /* fall through to in-memory */
    }
  }
  return memClaim(key, ttlMs);
}

/** Test hook: clear the in-memory store between cases. */
export function __resetMemStore() {
  mem.clear();
}
