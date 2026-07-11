/**
 * Fixed-window rate limiter for the LTI endpoints, backed by the pluggable
 * KV store (see kvStore.ts):
 *   - With a KV/Upstash REST endpoint configured, the counter is shared
 *     across all serverless instances — a real global quota.
 *   - Otherwise it degrades to a per-instance in-memory counter: best-effort,
 *     the same behaviour as before. Either way the LTI endpoints (JWT verify
 *     + outbound fetches) get a brake on hot-loop abuse.
 *
 * Client identity uses Vercel's trusted `x-real-ip` (the connecting client's
 * IP, set by the edge) rather than the client-controllable left-most
 * `x-forwarded-for` entry, which an attacker can rotate to mint a fresh
 * window per value.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { incrWithTtl } from './kvStore';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

function clientIp(req: VercelRequest): string {
  // `x-real-ip` is set by Vercel's edge to the actual connecting client and
  // is not overwritable by the client. Fall back to the last XFF hop (closest
  // to our edge, so least attacker-influenced) and then the socket address.
  const realIp = req.headers['x-real-ip'];
  const real = Array.isArray(realIp) ? realIp[0] : realIp;
  if (real) return real.trim();
  const fwd = req.headers['x-forwarded-for'];
  const fwdStr = Array.isArray(fwd) ? fwd[0] : fwd;
  const hops = fwdStr?.split(',').map((s) => s.trim()).filter(Boolean);
  if (hops && hops.length) return hops[hops.length - 1];
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Returns true if the request is allowed; on false it has already sent the
 * 429 response (with Retry-After) and the handler should return immediately.
 */
export async function rateLimit(
  req: VercelRequest,
  res: VercelResponse,
): Promise<boolean> {
  const key = `lti:rl:${clientIp(req)}`;
  const count = await incrWithTtl(key, WINDOW_MS);
  if (count > MAX_PER_WINDOW) {
    res.setHeader('Retry-After', String(Math.ceil(WINDOW_MS / 1000)));
    res.status(429).send('Too many requests');
    return false;
  }
  return true;
}
