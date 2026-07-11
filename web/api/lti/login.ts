/**
 * LTI 1.3 OIDC login initiation. The platform (LMS) hits this first; we look
 * up the trusted platform, mint a signed `state` (carrying a fresh nonce) and
 * redirect the browser to the platform's authorization endpoint. Accepts the
 * params via GET query or POST form, per the spec.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parsePlatforms, findPlatform, buildAuthRequestUrl } from '../../src/core/lti/ltiCore';
import { signState, toolBaseUrl } from '../_lib/lti';
import { rateLimit } from '../_lib/rateLimit';

function str(v: unknown): string {
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : '';
  return typeof v === 'string' ? v : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await rateLimit(req, res))) return;
  try {
    const src = (req.method === 'POST' ? req.body : req.query) ?? {};
    const iss = str(src.iss);
    const loginHint = str(src.login_hint);
    const clientId = str(src.client_id);
    const ltiMessageHint = str(src.lti_message_hint);

    if (!iss || !loginHint) {
      res.status(400).send('Missing iss or login_hint');
      return;
    }

    const platform = findPlatform(parsePlatforms(process.env.LTI_PLATFORMS), iss, clientId || undefined);
    if (!platform) {
      res.status(400).send('Unknown LTI platform (check LTI_PLATFORMS)');
      return;
    }

    const nonce = crypto.randomUUID();
    const state = await signState(platform.issuer, platform.clientId, nonce);
    const redirectUri = `${toolBaseUrl(req)}/api/lti/launch`;
    const url = buildAuthRequestUrl(platform, {
      loginHint,
      ltiMessageHint: ltiMessageHint || undefined,
      redirectUri,
      state,
      nonce,
    });
    res.redirect(302, url);
  } catch {
    res.status(500).send('LTI login error');
  }
}
