/**
 * Pure, framework-free LTI 1.3 (LTI Advantage) helpers — the testable core of
 * the roster-sync integration. The Vercel serverless handlers in `web/api/lti`
 * do the crypto (JWT sign/verify via `jose`) and HTTP; everything that can be
 * a pure function (URL building, claim validation, member → roster mapping,
 * config parsing) lives here so it can be unit-tested without a server or an
 * LMS.
 *
 * Scope: LtiResourceLinkRequest launch + Names & Role Provisioning Service
 * (NRPS) membership read. No deep linking, no grades.
 */

import { studentFromRoster, type RosterClass, type RosterStudentInput } from '../roster/types';

// ── LTI claim URIs & scopes ────────────────────────────────────────────────
export const LTI = {
  MESSAGE_TYPE: 'https://purl.imsglobal.org/spec/lti/claim/message_type',
  VERSION: 'https://purl.imsglobal.org/spec/lti/claim/version',
  DEPLOYMENT_ID: 'https://purl.imsglobal.org/spec/lti/claim/deployment_id',
  CONTEXT: 'https://purl.imsglobal.org/spec/lti/claim/context',
  NRPS: 'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice',
} as const;

export const NRPS_SCOPE = 'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly';
export const LEARNER_ROLE = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner';

/** A registered LMS platform we trust to launch us. */
export interface PlatformConfig {
  issuer: string;
  clientId: string;
  authEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
  /** Optional — some platforms send multiple deployments. */
  deploymentId?: string;
}

/** Parse the `LTI_PLATFORMS` env var (JSON array) into a lookup keyed by
 *  `issuer\nclientId`, since an issuer can host several client ids. */
export function parsePlatforms(json: string | undefined): Map<string, PlatformConfig> {
  const map = new Map<string, PlatformConfig>();
  if (!json) return map;
  let arr: unknown;
  try {
    arr = JSON.parse(json);
  } catch {
    return map;
  }
  if (!Array.isArray(arr)) return map;
  for (const item of arr) {
    const p = item as Partial<PlatformConfig>;
    if (p.issuer && p.clientId && p.authEndpoint && p.tokenEndpoint && p.jwksUri) {
      map.set(platformKey(p.issuer, p.clientId), p as PlatformConfig);
    }
  }
  return map;
}

export function platformKey(issuer: string, clientId: string): string {
  return `${issuer}\n${clientId}`;
}

/**
 * Find the platform for an OIDC login initiation. `clientId` may be absent in
 * the request; if so and the issuer is unambiguous, fall back to the single
 * matching platform.
 */
export function findPlatform(
  platforms: Map<string, PlatformConfig>,
  issuer: string,
  clientId?: string,
): PlatformConfig | undefined {
  if (clientId) return platforms.get(platformKey(issuer, clientId));
  const matches = [...platforms.values()].filter((p) => p.issuer === issuer);
  return matches.length === 1 ? matches[0] : undefined;
}

export interface OidcLoginParams {
  loginHint: string;
  ltiMessageHint?: string;
  redirectUri: string;
  state: string;
  nonce: string;
}

/** Build the platform authorization-endpoint URL for the OIDC `auth` step. */
export function buildAuthRequestUrl(platform: PlatformConfig, p: OidcLoginParams): string {
  const url = new URL(platform.authEndpoint);
  const q = url.searchParams;
  q.set('scope', 'openid');
  q.set('response_type', 'id_token');
  q.set('response_mode', 'form_post');
  q.set('prompt', 'none');
  q.set('client_id', platform.clientId);
  q.set('redirect_uri', p.redirectUri);
  q.set('login_hint', p.loginHint);
  q.set('state', p.state);
  q.set('nonce', p.nonce);
  if (p.ltiMessageHint) q.set('lti_message_hint', p.ltiMessageHint);
  return url.toString();
}

export interface LaunchInfo {
  deploymentId: string;
  contextTitle: string;
  nrpsUrl: string;
}

/**
 * SSRF guard for the NRPS endpoint. The membership URL rides inside the
 * (platform-signed but attacker-influenceable) id_token and is later fetched
 * server-side, so a forged or compromised launch could try to point us at
 * internal services. Require HTTPS and reject loopback / private / link-local
 * literal hosts. We deliberately do NOT pin to the issuer host — real LMS
 * deployments often serve NRPS from a sibling subdomain or CDN.
 * Throws on anything suspicious; returns the URL untouched otherwise.
 */
export function assertSafeNrpsUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid NRPS URL');
  }
  if (url.protocol !== 'https:') {
    throw new Error('NRPS URL must use HTTPS');
  }
  // url.hostname keeps the brackets on IPv6 literals ("[::1]"), which would
  // dodge the bare-address checks below — strip them first.
  let host = url.hostname.toLowerCase();
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);

  const isLoopback =
    host === 'localhost' ||
    host === '::1' ||
    host.endsWith('.localhost') ||
    /^127\./.test(host);
  const isPrivate =
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) || // 172.16.0.0 – 172.31.255.255
    /^169\.254\./.test(host) || // link-local
    host === '::' || // IPv6 unspecified
    /^0\./.test(host) || // 0.0.0.0/8
    /^(fc|fd)[0-9a-f]{0,2}:/.test(host) || // IPv6 ULA (fc00::/7)
    /^fe[89ab][0-9a-f]:/.test(host) || // IPv6 link-local (fe80::/10)
    // IPv4-mapped IPv6 (::ffff:a.b.c.d, normalised to ::ffff:7f00:1 etc.) is
    // never a legitimate public NRPS endpoint — block the whole class rather
    // than decode the trailing address.
    host.startsWith('::ffff:');
  if (isLoopback || isPrivate) {
    throw new Error('NRPS URL points at a non-routable host');
  }
  return raw;
}

/**
 * Validate the LTI-specific claims of a verified id_token payload and pull out
 * what roster sync needs. Throws with a clear message on anything unexpected.
 * (JWT signature/iss/aud/nonce are checked by the handler before this runs.)
 */
export function validateLaunchClaims(payload: Record<string, unknown>): LaunchInfo {
  if (payload[LTI.MESSAGE_TYPE] !== 'LtiResourceLinkRequest') {
    throw new Error('Unsupported LTI message type');
  }
  if (payload[LTI.VERSION] !== '1.3.0') {
    throw new Error('Unsupported LTI version (need 1.3.0)');
  }
  const deploymentId = payload[LTI.DEPLOYMENT_ID];
  if (typeof deploymentId !== 'string') throw new Error('Missing deployment id');

  const nrps = payload[LTI.NRPS] as { context_memberships_url?: unknown } | undefined;
  const nrpsRaw = nrps?.context_memberships_url;
  if (typeof nrpsRaw !== 'string') {
    throw new Error('This launch did not grant roster access (NRPS). Enable Names & Roles for the tool.');
  }
  const nrpsUrl = assertSafeNrpsUrl(nrpsRaw);

  const context = payload[LTI.CONTEXT] as { title?: unknown; label?: unknown } | undefined;
  const contextTitle =
    (typeof context?.title === 'string' && context.title) ||
    (typeof context?.label === 'string' && context.label) ||
    'Imported class';

  return { deploymentId, contextTitle, nrpsUrl };
}

interface NrpsMember {
  status?: string;
  roles?: unknown;
  name?: unknown;
  given_name?: unknown;
  family_name?: unknown;
  email?: unknown;
  user_id?: unknown;
}

/** Map an NRPS membership-container response to a roster of *students*. */
export function mapMembersToRoster(json: unknown, contextTitle: string): RosterClass {
  const members = (json as { members?: unknown[] })?.members;
  const inputs: RosterStudentInput[] = [];
  if (Array.isArray(members)) {
    for (const m of members as NrpsMember[]) {
      if (typeof m.status === 'string' && m.status.toLowerCase() === 'inactive') continue;
      const roles = Array.isArray(m.roles) ? (m.roles as string[]) : [];
      // Keep learners; if no roles are present at all, keep (some platforms omit).
      if (roles.length > 0 && !roles.some((r) => r === LEARNER_ROLE || r.endsWith('#Learner'))) {
        continue;
      }
      const name =
        (typeof m.name === 'string' && m.name.trim()) ||
        [m.given_name, m.family_name]
          .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
          .join(' ')
          .trim();
      if (!name) continue;
      inputs.push({
        name,
        sourceId: typeof m.user_id === 'string' ? m.user_id : undefined,
        email: typeof m.email === 'string' ? m.email : undefined,
      });
    }
  }
  return {
    sourceId: 'lti',
    name: contextTitle,
    students: inputs.map(studentFromRoster),
  };
}

/**
 * Re-build a trusted RosterClass from the (attacker-controllable) URL-fragment
 * payload the launch page hands the SPA. We never trust the incoming objects —
 * only their `name`/`email` strings — and rebuild clean Students via
 * `studentFromRoster`, capping the count. Returns null if unusable.
 */
export function sanitizeRosterPayload(json: unknown, cap = 200): RosterClass | null {
  if (!json || typeof json !== 'object') return null;
  const obj = json as { name?: unknown; students?: unknown };
  if (!Array.isArray(obj.students)) return null;
  const students: RosterStudentInput[] = [];
  for (const raw of obj.students.slice(0, cap)) {
    const s = raw as { name?: unknown; email?: unknown };
    const name = typeof s.name === 'string' ? s.name.trim() : '';
    if (!name) continue;
    students.push({ name, email: typeof s.email === 'string' ? s.email : undefined });
  }
  if (students.length === 0) return null;
  return {
    sourceId: 'lti',
    name: typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : 'Imported class',
    students: students.map(studentFromRoster),
  };
}
