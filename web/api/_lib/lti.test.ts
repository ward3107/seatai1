/**
 * @vitest-environment node
 *
 * Smoke tests for the LTI server lib. These exercise the real crypto (jose)
 * and the network helpers with a mocked platform, so the handlers can be
 * trusted without a live LMS. A throwaway RSA keypair stands in for the tool
 * key; a second keypair plays the platform.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { generateKeyPair, exportPKCS8, exportJWK, SignJWT, type KeyLike, type JWK } from 'jose';
import * as lib from './lti';
import { LTI } from '../../src/core/lti/ltiCore';

// jose's createRemoteJWKSet uses its own fetcher (not globalThis.fetch), so
// we swap it for a local JWKS the test controls. Everything else stays real.
const hoisted = vi.hoisted(() => ({ platformJwks: null as { keys: JWK[] } | null }));
vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jose')>();
  return {
    ...actual,
    createRemoteJWKSet: () => actual.createLocalJWKSet(hoisted.platformJwks!),
  };
});

const PLATFORM = {
  issuer: 'https://lms.test',
  clientId: 'client-1',
  authEndpoint: 'https://lms.test/auth',
  tokenEndpoint: 'https://lms.test/token',
  jwksUri: 'https://lms.test/jwks',
};

let platformPriv: KeyLike;
let platformPubJwk: JWK;

beforeAll(async () => {
  const tool = await generateKeyPair('RS256');
  process.env.LTI_PRIVATE_KEY = await exportPKCS8(tool.privateKey);
  process.env.LTI_KID = 'tool-kid';
  process.env.LTI_TOOL_URL = 'https://tool.test';
  process.env.LTI_PLATFORMS = JSON.stringify([PLATFORM]);

  const platform = await generateKeyPair('RS256');
  platformPriv = platform.privateKey;
  platformPubJwk = { ...(await exportJWK(platform.publicKey)), kid: 'platform-kid', alg: 'RS256', use: 'sig' };
  hoisted.platformJwks = { keys: [platformPubJwk] };
});

afterEach(() => vi.unstubAllGlobals());

/** Build an id_token signed by the mock platform. */
async function makeIdToken(claims: Record<string, unknown>): Promise<string> {
  return new SignJWT({
    [LTI.MESSAGE_TYPE]: 'LtiResourceLinkRequest',
    [LTI.VERSION]: '1.3.0',
    [LTI.DEPLOYMENT_ID]: 'dep-1',
    [LTI.CONTEXT]: { title: 'Grade 5 Math' },
    [LTI.NRPS]: { context_memberships_url: 'https://lms.test/memberships' },
    ...claims,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'platform-kid' })
    .setIssuer(PLATFORM.issuer)
    .setAudience(PLATFORM.clientId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(platformPriv);
}

/** Route fetch by URL to mock platform endpoints. */
function stubFetch(routes: Record<string, () => Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) => {
      const u = url.toString();
      for (const [prefix, make] of Object.entries(routes)) {
        if (u.startsWith(prefix)) return make();
      }
      throw new Error(`unexpected fetch: ${u}`);
    }),
  );
}

const jsonRes = (obj: unknown) =>
  new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' } });

describe('signState / verifyState', () => {
  it('round-trips issuer, clientId and nonce', async () => {
    const state = await lib.signState(PLATFORM.issuer, PLATFORM.clientId, 'nonce-1');
    const payload = await lib.verifyState(state);
    expect(payload.iss_lms).toBe(PLATFORM.issuer);
    expect(payload.cid).toBe(PLATFORM.clientId);
    expect(payload.nonce).toBe('nonce-1');
  });

  it('rejects a tampered state', async () => {
    const state = await lib.signState(PLATFORM.issuer, PLATFORM.clientId, 'n');
    await expect(lib.verifyState(state + 'x')).rejects.toThrow();
  });
});

describe('jwks', () => {
  it('exposes the public key and never the private half', async () => {
    const { keys } = await lib.jwks();
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatchObject({ kid: 'tool-kid', alg: 'RS256', use: 'sig', kty: 'RSA' });
    expect((keys[0] as Record<string, unknown>).d).toBeUndefined(); // no private exponent
  });
});

describe('verifyIdToken', () => {
  it('verifies a platform-signed id_token against its JWKS', async () => {
    const idToken = await makeIdToken({ nonce: 'abc' });
    const payload = await lib.verifyIdToken(idToken, PLATFORM);
    expect(payload.nonce).toBe('abc');
    expect(payload[LTI.MESSAGE_TYPE]).toBe('LtiResourceLinkRequest');
  });

  it('rejects an id_token with the wrong audience', async () => {
    const bad = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'platform-kid' })
      .setIssuer(PLATFORM.issuer)
      .setAudience('someone-else')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(platformPriv);
    await expect(lib.verifyIdToken(bad, PLATFORM)).rejects.toThrow();
  });
});

describe('getNrpsToken', () => {
  it('exchanges a key-signed client assertion for an access token', async () => {
    let postedBody = '';
    stubFetch({
      'https://lms.test/token': () => jsonRes({ access_token: 'tok-123', token_type: 'Bearer' }),
    });
    // capture the request body
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementationOnce(async (_url: string, init: RequestInit) => {
      postedBody = String(init.body);
      return jsonRes({ access_token: 'tok-123' });
    });
    const token = await lib.getNrpsToken(PLATFORM);
    expect(token).toBe('tok-123');
    expect(postedBody).toContain('grant_type=client_credentials');
    expect(postedBody).toContain('client_assertion=');
  });
});

describe('fetchRoster', () => {
  it('maps NRPS members to a roster of learners only', async () => {
    stubFetch({
      'https://lms.test/memberships': () =>
        jsonRes({
          members: [
            { user_id: '1', name: 'Alice', roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'] },
            { user_id: '2', name: 'Mr Teacher', roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'] },
          ],
        }),
    });
    const roster = await lib.fetchRoster(
      { deploymentId: 'd', contextTitle: 'Grade 5 Math', nrpsUrl: 'https://lms.test/memberships' },
      'tok-123',
    );
    expect(roster.name).toBe('Grade 5 Math');
    expect(roster.students.map((s) => s.name)).toEqual(['Alice']);
  });

  it('follows NRPS Link: rel="next" pagination', async () => {
    let page = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        page++;
        if (page === 1) {
          return new Response(
            JSON.stringify({ members: [{ user_id: '1', name: 'Alice', roles: ['#Learner'] }] }),
            { headers: { 'content-type': 'application/json', link: '<https://lms.test/memberships?p=2>; rel="next"' } },
          );
        }
        return jsonRes({ members: [{ user_id: '2', name: 'Bob', roles: ['#Learner'] }] });
      }),
    );
    const roster = await lib.fetchRoster(
      { deploymentId: 'd', contextTitle: 'C', nrpsUrl: 'https://lms.test/memberships' },
      't',
    );
    expect(roster.students.map((s) => s.name).sort()).toEqual(['Alice', 'Bob']);
    expect(page).toBe(2);
  });

  it('refuses a pagination next-link that points at an internal host (SSRF)', async () => {
    let fetchedSecond = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        if (url.toString().includes('169.254.169.254')) {
          fetchedSecond = true;
          return jsonRes({ members: [] });
        }
        return new Response(
          JSON.stringify({ members: [{ user_id: '1', name: 'Alice', roles: ['#Learner'] }] }),
          {
            headers: {
              'content-type': 'application/json',
              // Malicious platform points the next page at cloud metadata.
              link: '<https://169.254.169.254/latest/meta-data/>; rel="next"',
            },
          },
        );
      }),
    );
    await expect(
      lib.fetchRoster(
        { deploymentId: 'd', contextTitle: 'C', nrpsUrl: 'https://lms.test/memberships' },
        't',
      ),
    ).rejects.toThrow(/non-routable/i);
    // The internal address must never have been fetched.
    expect(fetchedSecond).toBe(false);
  });
});
