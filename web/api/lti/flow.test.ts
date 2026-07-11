/**
 * @vitest-environment node
 *
 * End-to-end smoke test of the LTI serverless handlers with a mocked platform:
 * OIDC login → (platform signs an id_token) → launch → roster handoff. Proves
 * the wiring works without a live LMS. Uses real jose crypto; only the remote
 * JWKS fetch and the token/NRPS endpoints are mocked.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { generateKeyPair, exportPKCS8, exportJWK, SignJWT, type KeyLike, type JWK } from 'jose';
import { LTI } from '../../src/core/lti/ltiCore';
import { verifyState } from '../_lib/lti';
import loginHandler from './login';
import launchHandler from './launch';

const hoisted = vi.hoisted(() => ({ platformJwks: null as { keys: JWK[] } | null }));
vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jose')>();
  return { ...actual, createRemoteJWKSet: () => actual.createLocalJWKSet(hoisted.platformJwks!) };
});

const PLATFORM = {
  issuer: 'https://lms.test',
  clientId: 'client-1',
  authEndpoint: 'https://lms.test/auth',
  tokenEndpoint: 'https://lms.test/token',
  jwksUri: 'https://lms.test/jwks',
};

let platformPriv: KeyLike;

beforeAll(async () => {
  const tool = await generateKeyPair('RS256');
  process.env.LTI_PRIVATE_KEY = await exportPKCS8(tool.privateKey);
  process.env.LTI_KID = 'tool-kid';
  process.env.LTI_TOOL_URL = 'https://tool.test';
  process.env.LTI_PLATFORMS = JSON.stringify([PLATFORM]);

  const platform = await generateKeyPair('RS256');
  platformPriv = platform.privateKey;
  hoisted.platformJwks = {
    keys: [{ ...(await exportJWK(platform.publicKey)), kid: 'platform-kid', alg: 'RS256', use: 'sig' }],
  };
});

afterEach(() => vi.unstubAllGlobals());

// Minimal VercelRequest/VercelResponse doubles.
function mockReq(over: Record<string, unknown>) {
  return {
    method: 'GET',
    query: {},
    body: {},
    headers: { host: 'tool.test', 'x-forwarded-proto': 'https' },
    ...over,
  } as never;
}
function mockRes() {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    redirectUrl: '',
    setHeader(k: string, v: string) { this.headers[k.toLowerCase()] = v; return this; },
    status(c: number) { this.statusCode = c; return this; },
    send(b: unknown) { this.body = b; return this; },
    json(o: unknown) { this.body = o; return this; },
    redirect(code: number, url: string) { this.statusCode = code; this.redirectUrl = url; return this; },
  };
  return res;
}

const jsonRes = (obj: unknown) =>
  new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' } });

describe('LTI handler flow', () => {
  it('login redirects to the platform auth endpoint with a valid signed state', async () => {
    const res = mockRes();
    await loginHandler(
      mockReq({ method: 'GET', query: { iss: PLATFORM.issuer, login_hint: 'lh', client_id: PLATFORM.clientId, lti_message_hint: 'mh' } }),
      res as never,
    );
    expect(res.statusCode).toBe(302);
    const url = new URL(res.redirectUrl);
    expect(url.origin + url.pathname).toBe('https://lms.test/auth');
    expect(url.searchParams.get('client_id')).toBe('client-1');
    expect(url.searchParams.get('login_hint')).toBe('lh');
    // The state must be one we can verify, carrying a nonce.
    const state = url.searchParams.get('state')!;
    const payload = await verifyState(state);
    expect(payload.nonce).toBeTruthy();
  });

  it('rejects login for an unknown issuer', async () => {
    const res = mockRes();
    await loginHandler(mockReq({ query: { iss: 'https://evil.test', login_hint: 'x' } }), res as never);
    expect(res.statusCode).toBe(400);
  });

  it('completes a launch and hands the roster to the SPA via the fragment', async () => {
    // 1. Login to obtain a real signed state + its nonce.
    const loginRes = mockRes();
    await loginHandler(
      mockReq({ query: { iss: PLATFORM.issuer, login_hint: 'lh', client_id: PLATFORM.clientId } }),
      loginRes as never,
    );
    const state = new URL(loginRes.redirectUrl).searchParams.get('state')!;
    const { nonce } = await verifyState(state);

    // 2. Platform signs an id_token bound to that nonce.
    const idToken = await new SignJWT({
      [LTI.MESSAGE_TYPE]: 'LtiResourceLinkRequest',
      [LTI.VERSION]: '1.3.0',
      [LTI.DEPLOYMENT_ID]: 'dep-1',
      [LTI.CONTEXT]: { title: 'Grade 5 Math' },
      [LTI.NRPS]: { context_memberships_url: 'https://lms.test/memberships' },
      nonce,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'platform-kid' })
      .setIssuer(PLATFORM.issuer)
      .setAudience(PLATFORM.clientId)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(platformPriv);

    // 3. Mock the token + NRPS endpoints.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const u = url.toString();
        if (u.startsWith('https://lms.test/token')) return jsonRes({ access_token: 'tok' });
        if (u.startsWith('https://lms.test/memberships')) {
          return jsonRes({
            members: [
              { user_id: '1', name: 'Alice Cohen', roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'] },
              { user_id: '2', name: 'Mr Teacher', roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'] },
            ],
          });
        }
        throw new Error(`unexpected fetch ${u}`);
      }),
    );

    // 4. Launch.
    const res = mockRes();
    await launchHandler(mockReq({ method: 'POST', body: { id_token: idToken, state } }), res as never);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-security-policy']).toContain('frame-ancestors');
    const html = String(res.body);
    expect(html).toContain('Imported 1 students from Grade 5 Math');
    expect(html).toContain('#lti=');

    // Decode the fragment payload and confirm only the learner made it in.
    const m = html.match(/#lti=([^"'\\]+)/);
    const roster = JSON.parse(decodeURIComponent(m![1]));
    expect(roster.name).toBe('Grade 5 Math');
    expect(roster.students.map((s: { name: string }) => s.name)).toEqual(['Alice Cohen']);
  });

  it('rejects a replay of an already-used launch (single-use nonce)', async () => {
    // Fresh login → nonce.
    const loginRes = mockRes();
    await loginHandler(
      mockReq({ query: { iss: PLATFORM.issuer, login_hint: 'lh', client_id: PLATFORM.clientId } }),
      loginRes as never,
    );
    const state = new URL(loginRes.redirectUrl).searchParams.get('state')!;
    const { nonce } = await verifyState(state);

    const idToken = await new SignJWT({
      [LTI.MESSAGE_TYPE]: 'LtiResourceLinkRequest',
      [LTI.VERSION]: '1.3.0',
      [LTI.DEPLOYMENT_ID]: 'dep-1',
      [LTI.CONTEXT]: { title: 'Grade 5 Math' },
      [LTI.NRPS]: { context_memberships_url: 'https://lms.test/memberships' },
      nonce,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'platform-kid' })
      .setIssuer(PLATFORM.issuer)
      .setAudience(PLATFORM.clientId)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(platformPriv);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const u = url.toString();
        if (u.startsWith('https://lms.test/token')) return jsonRes({ access_token: 'tok' });
        if (u.startsWith('https://lms.test/memberships')) {
          return jsonRes({
            members: [
              { user_id: '1', name: 'Alice Cohen', roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'] },
            ],
          });
        }
        throw new Error(`unexpected fetch ${u}`);
      }),
    );

    // First launch succeeds and claims the nonce.
    const first = mockRes();
    await launchHandler(mockReq({ method: 'POST', body: { id_token: idToken, state } }), first as never);
    expect(first.statusCode).toBe(200);

    // Replaying the identical (still-valid) launch must be rejected.
    const replay = mockRes();
    await launchHandler(mockReq({ method: 'POST', body: { id_token: idToken, state } }), replay as never);
    expect(replay.statusCode).toBe(400);
    expect(String(replay.body)).toContain('Nonce already used');
  });

  it('rejects a launch whose id_token nonce does not match the state', async () => {
    const loginRes = mockRes();
    await loginHandler(
      mockReq({ query: { iss: PLATFORM.issuer, login_hint: 'lh', client_id: PLATFORM.clientId } }),
      loginRes as never,
    );
    const state = new URL(loginRes.redirectUrl).searchParams.get('state')!;
    const idToken = await new SignJWT({
      [LTI.MESSAGE_TYPE]: 'LtiResourceLinkRequest',
      [LTI.VERSION]: '1.3.0',
      [LTI.DEPLOYMENT_ID]: 'dep-1',
      [LTI.NRPS]: { context_memberships_url: 'https://lms.test/memberships' },
      nonce: 'WRONG',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'platform-kid' })
      .setIssuer(PLATFORM.issuer)
      .setAudience(PLATFORM.clientId)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(platformPriv);

    const res = mockRes();
    await launchHandler(mockReq({ method: 'POST', body: { id_token: idToken, state } }), res as never);
    expect(res.statusCode).toBe(400);
  });
});
