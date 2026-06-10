/**
 * Server-side LTI helpers for the Vercel functions: key management, the
 * signed-JWT `state` (cookie-free so it survives LMS iframes that block
 * third-party cookies), the NRPS access-token + membership fetch, and the
 * HTML page that hands the roster back to the SPA via the URL fragment.
 *
 * Pure protocol logic (URL building, claim validation, member mapping) lives
 * in ../../src/core/lti/ltiCore and is unit-tested there.
 */
import {
  SignJWT,
  jwtVerify,
  importPKCS8,
  exportJWK,
  importJWK,
  createRemoteJWKSet,
  type JWTPayload,
  type KeyLike,
  type JWK,
} from 'jose';
import type { VercelRequest } from '@vercel/node';
import {
  NRPS_SCOPE,
  mapMembersToRoster,
  type PlatformConfig,
  type LaunchInfo,
} from '../../src/core/lti/ltiCore';
import type { RosterClass } from '../../src/core/roster/types';

const ALG = 'RS256';

/** Per-request ceiling on outbound LMS calls so a slow/hanging platform can't
 *  pin the serverless function open until it times out at the platform level. */
const FETCH_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function toolBaseUrl(req: VercelRequest): string {
  if (process.env.LTI_TOOL_URL) return process.env.LTI_TOOL_URL.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https';
  const host = req.headers.host;
  return `${proto}://${host}`;
}

let keyCache: { privateKey: KeyLike; publicJwk: Record<string, unknown> } | null = null;

/** Import the tool's RSA private key (PKCS8 PEM in LTI_PRIVATE_KEY, with
 *  literal \n tolerated) and derive the public JWK for the JWKS endpoint. */
export async function getKeys() {
  if (keyCache) return keyCache;
  const pem = (process.env.LTI_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
  if (!pem) throw new Error('LTI_PRIVATE_KEY is not configured');
  const privateKey = await importPKCS8(pem, ALG);
  const full = (await exportJWK(privateKey)) as unknown as Record<string, unknown>;
  // Strip private components → public JWK.
  const { d, p, q, dp, dq, qi, ...pub } = full;
  void d; void p; void q; void dp; void dq; void qi;
  const publicJwk = { ...pub, alg: ALG, use: 'sig', kid: process.env.LTI_KID || 'seatai-lti' };
  keyCache = { privateKey, publicJwk };
  return keyCache;
}

/** Public JWK set for the platform to verify our client assertions. */
export async function jwks() {
  const { publicJwk } = await getKeys();
  return { keys: [publicJwk] };
}

interface StatePayload extends JWTPayload {
  iss_lms: string;
  cid: string;
  nonce: string;
}

/** Sign the OIDC `state` so launch can validate it without server storage. */
export async function signState(issuer: string, clientId: string, nonce: string): Promise<string> {
  const { privateKey } = await getKeys();
  return new SignJWT({ iss_lms: issuer, cid: clientId, nonce })
    .setProtectedHeader({ alg: ALG, kid: process.env.LTI_KID || 'seatai-lti' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

export async function verifyState(state: string): Promise<StatePayload> {
  const { privateKey } = await getKeys();
  // Verify against our own public key (derived from the private import).
  const pub = await importJWK((await getKeys()).publicJwk as unknown as JWK, ALG);
  void privateKey;
  const { payload } = await jwtVerify(state, pub);
  return payload as StatePayload;
}

/** Verify the platform-signed id_token against its JWKS. */
export async function verifyIdToken(idToken: string, platform: PlatformConfig) {
  const JWKS = createRemoteJWKSet(new URL(platform.jwksUri));
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: platform.issuer,
    audience: platform.clientId,
  });
  return payload as Record<string, unknown>;
}

/** client_credentials grant with a private-key-signed client assertion →
 *  an NRPS-scoped access token. */
export async function getNrpsToken(platform: PlatformConfig): Promise<string> {
  const { privateKey } = await getKeys();
  const assertion = await new SignJWT({})
    .setProtectedHeader({ alg: ALG, kid: process.env.LTI_KID || 'seatai-lti' })
    .setIssuer(platform.clientId)
    .setSubject(platform.clientId)
    .setAudience(platform.tokenEndpoint)
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setExpirationTime('60s')
    .sign(privateKey);

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: assertion,
    scope: NRPS_SCOPE,
  });
  const res = await fetchWithTimeout(platform.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token endpoint ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('No access token from platform');
  return json.access_token;
}

/** Fetch the membership container, following NRPS pagination via Link headers. */
export async function fetchRoster(launch: LaunchInfo, token: string): Promise<RosterClass> {
  let url: string | null = launch.nrpsUrl;
  const members: unknown[] = [];
  for (let page = 0; page < 20 && url; page++) {
    const res: Response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.ims.lti-nrps.v2.membershipcontainer+json',
      },
    });
    if (!res.ok) throw new Error(`NRPS ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { members?: unknown[] };
    if (Array.isArray(json.members)) members.push(...json.members);
    url = parseNextLink(res.headers.get('link'));
  }
  return mapMembersToRoster({ members }, launch.contextTitle);
}

/** RFC-5988 `Link: <url>; rel="next"` parser for NRPS pagination. */
function parseNextLink(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(',')) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="?next"?/);
    if (m) return m[1];
  }
  return null;
}


/**
 * HTML returned from the launch endpoint. It hands the roster to the SPA via
 * the URL fragment (never sent to a server, and partition-safe inside LMS
 * iframes) and navigates the top window to SeatAI. A manual link is the
 * no-JS / blocked-redirect fallback.
 */
export function handoffPage(roster: RosterClass, toolUrl: string): string {
  const dest = `${toolUrl}/#lti=${encodeURIComponent(JSON.stringify(roster))}`;
  const destLiteral = JSON.stringify(dest);
  return `<!doctype html><html><head><meta charset="utf-8"><title>SeatAI</title></head>
<body style="font-family:system-ui;padding:2rem;text-align:center">
<p>Imported ${roster.students.length} students from ${escapeHtml(roster.name)}. Opening SeatAI…</p>
<p><a id="go" href="${dest}">Open SeatAI</a></p>
<script>
(function(){
  try{ (window.top||window).location.replace(${destLiteral}); }
  catch(e){ try{ window.location.replace(${destLiteral}); }catch(_){} }
})();
</script>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}
