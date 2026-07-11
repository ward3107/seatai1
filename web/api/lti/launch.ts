/**
 * LTI 1.3 launch (redirect_uri). The platform form-POSTs the signed id_token
 * back here. We validate our `state`, verify the id_token against the
 * platform's JWKS, confirm the nonce, then call NRPS for the class roster and
 * hand it to the SPA via a fragment redirect.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parsePlatforms, findPlatform, validateLaunchClaims } from '../../src/core/lti/ltiCore';
import {
  verifyState,
  verifyIdToken,
  getNrpsToken,
  fetchRoster,
  handoffPage,
  toolBaseUrl,
} from '../_lib/lti';
import { rateLimit } from '../_lib/rateLimit';
import { claimOnce } from '../_lib/kvStore';

/** How long a used nonce is remembered — must cover the signed state's
 *  lifetime (5m, see signState) so a captured launch can't be replayed for
 *  the whole window the state is otherwise valid. A small margin is added. */
const NONCE_TTL_MS = 6 * 60_000;

function str(v: unknown): string {
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : '';
  return typeof v === 'string' ? v : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await rateLimit(req, res))) return;
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }
    const body = req.body ?? {};
    const idToken = str(body.id_token);
    const state = str(body.state);
    if (!idToken || !state) {
      res.status(400).send('Missing id_token or state');
      return;
    }

    const st = await verifyState(state); // throws if forged/expired
    const platform = findPlatform(parsePlatforms(process.env.LTI_PLATFORMS), st.iss_lms, st.cid);
    if (!platform) {
      res.status(400).send('Unknown LTI platform');
      return;
    }

    const payload = await verifyIdToken(idToken, platform);
    if (payload.nonce !== st.nonce) {
      res.status(400).send('Nonce mismatch');
      return;
    }

    // Single-use nonce: LTI 1.3 requires a nonce be accepted only once.
    // Atomically claim it; a replay of a captured (still-unexpired) launch
    // loses the race and is rejected here instead of re-triggering the NRPS
    // roster fetch. Best-effort per-instance without a KV backend; global
    // once one is configured.
    if (typeof st.nonce === 'string' && st.nonce) {
      const fresh = await claimOnce(`lti:nonce:${st.nonce}`, NONCE_TTL_MS);
      if (!fresh) {
        res.status(400).send('Nonce already used');
        return;
      }
    }

    const launch = validateLaunchClaims(payload);
    const token = await getNrpsToken(platform);
    const roster = await fetchRoster(launch, token);

    // This transient page is meant to render inside the LMS iframe, so allow
    // framing for this response only (the SPA itself stays X-Frame-Options:
    // DENY). Scope framing to the launching platform's origin instead of "*"
    // so arbitrary sites can't embed this roster-bearing handoff page.
    let frameAncestors = "'none'";
    try {
      frameAncestors = new URL(platform.issuer).origin;
    } catch {
      /* issuer is validated at parse time; fall back to 'none' if malformed */
    }
    res.setHeader('Content-Security-Policy', `frame-ancestors ${frameAncestors}`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(handoffPage(roster, toolBaseUrl(req)));
  } catch (e) {
    // Log the real cause server-side; return a generic message so internal
    // details (endpoint URLs, upstream status text) don't leak to the browser.
    console.error('LTI launch error:', e);
    res.status(400).send('LTI launch failed: unable to complete authentication.');
  }
}
