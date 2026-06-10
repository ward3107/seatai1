/**
 * Minimal fixed-window rate limiter for the LTI endpoints.
 *
 * Scope honestly stated: state is per serverless instance, so this is a
 * best-effort brake on bursts and naive abuse (script hammering one warm
 * instance), not a hard global quota — Vercel may fan requests out across
 * instances. That's the right trade-off here: the LTI endpoints are
 * crypto-heavy (JWT verify + outbound fetches) and a single hot loop against
 * one instance is the realistic failure mode. A durable store (KV/Upstash)
 * can replace `hits` later without changing call sites.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

interface Window {
  start: number;
  count: number;
}

const hits = new Map<string, Window>();

function clientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd;
  // x-forwarded-for is client-controllable in general, but on Vercel the
  // left-most entry is set by their edge. Fall back to the socket address.
  return first?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

/**
 * Returns true if the request is allowed; on false it has already sent the
 * 429 response (with Retry-After) and the handler should return immediately.
 */
export function rateLimit(req: VercelRequest, res: VercelResponse): boolean {
  const now = Date.now();

  // Opportunistic GC so the map can't grow unbounded on a long-lived instance.
  if (hits.size > 1000) {
    for (const [k, w] of hits) {
      if (now - w.start > WINDOW_MS) hits.delete(k);
    }
  }

  const key = clientIp(req);
  const win = hits.get(key);
  if (!win || now - win.start > WINDOW_MS) {
    hits.set(key, { start: now, count: 1 });
    return true;
  }
  win.count++;
  if (win.count > MAX_PER_WINDOW) {
    const retryAfter = Math.ceil((win.start + WINDOW_MS - now) / 1000);
    res.setHeader('Retry-After', String(Math.max(retryAfter, 1)));
    res.status(429).send('Too many requests');
    return false;
  }
  return true;
}
