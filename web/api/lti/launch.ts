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

function str(v: unknown): string {
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : '';
  return typeof v === 'string' ? v : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    const launch = validateLaunchClaims(payload);
    const token = await getNrpsToken(platform);
    const roster = await fetchRoster(launch, token);

    // This transient page is meant to render inside the LMS iframe, so allow
    // framing for this response only (the SPA itself stays X-Frame-Options: DENY).
    res.setHeader('Content-Security-Policy', 'frame-ancestors *');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(handoffPage(roster, toolBaseUrl(req)));
  } catch (e) {
    res.status(400).send(`LTI launch failed: ${e instanceof Error ? e.message : 'error'}`);
  }
}
