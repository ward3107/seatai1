/**
 * Tool JWKS endpoint — exposes the public half of our signing key so the
 * platform can verify the client assertions we send to its token endpoint.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwks } from '../_lib/lti';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).json(await jwks());
  } catch {
    res.status(500).json({ error: 'JWKS unavailable (LTI_PRIVATE_KEY not configured)' });
  }
}
