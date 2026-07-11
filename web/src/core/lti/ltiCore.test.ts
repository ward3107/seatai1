import { describe, it, expect } from 'vitest';
import {
  LTI,
  parsePlatforms,
  findPlatform,
  buildAuthRequestUrl,
  validateLaunchClaims,
  assertSafeNrpsUrl,
  mapMembersToRoster,
  sanitizeRosterPayload,
  type PlatformConfig,
} from './ltiCore';

const platform: PlatformConfig = {
  issuer: 'https://canvas.test',
  clientId: 'client-123',
  authEndpoint: 'https://canvas.test/api/lti/authorize_redirect',
  tokenEndpoint: 'https://canvas.test/login/oauth2/token',
  jwksUri: 'https://canvas.test/api/lti/security/jwks',
};

describe('parsePlatforms / findPlatform', () => {
  it('parses a JSON array and looks up by issuer + clientId', () => {
    const map = parsePlatforms(JSON.stringify([platform]));
    expect(map.size).toBe(1);
    expect(findPlatform(map, 'https://canvas.test', 'client-123')).toEqual(platform);
  });

  it('falls back to the single platform for an issuer when clientId is absent', () => {
    const map = parsePlatforms(JSON.stringify([platform]));
    expect(findPlatform(map, 'https://canvas.test')).toEqual(platform);
  });

  it('returns undefined for ambiguous issuer or unknown / bad input', () => {
    const two = parsePlatforms(JSON.stringify([platform, { ...platform, clientId: 'client-999' }]));
    expect(findPlatform(two, 'https://canvas.test')).toBeUndefined();
    expect(parsePlatforms('not json').size).toBe(0);
    expect(parsePlatforms(undefined).size).toBe(0);
    // missing required fields → skipped
    expect(parsePlatforms(JSON.stringify([{ issuer: 'x' }])).size).toBe(0);
  });
});

describe('buildAuthRequestUrl', () => {
  it('builds a spec-compliant OIDC auth request', () => {
    const url = new URL(
      buildAuthRequestUrl(platform, {
        loginHint: 'hint-1',
        ltiMessageHint: 'msg-1',
        redirectUri: 'https://tool.test/api/lti/launch',
        state: 'st',
        nonce: 'no',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://canvas.test/api/lti/authorize_redirect');
    const q = url.searchParams;
    expect(q.get('response_type')).toBe('id_token');
    expect(q.get('response_mode')).toBe('form_post');
    expect(q.get('scope')).toBe('openid');
    expect(q.get('prompt')).toBe('none');
    expect(q.get('client_id')).toBe('client-123');
    expect(q.get('redirect_uri')).toBe('https://tool.test/api/lti/launch');
    expect(q.get('login_hint')).toBe('hint-1');
    expect(q.get('lti_message_hint')).toBe('msg-1');
    expect(q.get('state')).toBe('st');
    expect(q.get('nonce')).toBe('no');
  });
});

describe('validateLaunchClaims', () => {
  const valid = {
    [LTI.MESSAGE_TYPE]: 'LtiResourceLinkRequest',
    [LTI.VERSION]: '1.3.0',
    [LTI.DEPLOYMENT_ID]: 'dep-1',
    [LTI.CONTEXT]: { title: 'Grade 5 Math', label: 'M5' },
    [LTI.NRPS]: { context_memberships_url: 'https://canvas.test/memberships/1' },
  };

  it('extracts deployment, context title and NRPS url', () => {
    expect(validateLaunchClaims(valid)).toEqual({
      deploymentId: 'dep-1',
      contextTitle: 'Grade 5 Math',
      nrpsUrl: 'https://canvas.test/memberships/1',
    });
  });

  it('rejects wrong message type / version and missing NRPS', () => {
    expect(() => validateLaunchClaims({ ...valid, [LTI.MESSAGE_TYPE]: 'x' })).toThrow();
    expect(() => validateLaunchClaims({ ...valid, [LTI.VERSION]: '1.2.0' })).toThrow();
    const noNrps = { ...valid };
    delete (noNrps as Record<string, unknown>)[LTI.NRPS];
    expect(() => validateLaunchClaims(noNrps)).toThrow(/roster access/i);
  });

  it('falls back to label, then a default, for the class name', () => {
    expect(validateLaunchClaims({ ...valid, [LTI.CONTEXT]: { label: 'M5' } }).contextTitle).toBe('M5');
    expect(validateLaunchClaims({ ...valid, [LTI.CONTEXT]: {} }).contextTitle).toBe('Imported class');
  });

  it('rejects an NRPS url that targets a non-routable host (SSRF guard)', () => {
    const ssrf = (url: string) => ({ ...valid, [LTI.NRPS]: { context_memberships_url: url } });
    expect(() => validateLaunchClaims(ssrf('http://canvas.test/m'))).toThrow(/HTTPS/i);
    expect(() => validateLaunchClaims(ssrf('https://127.0.0.1/m'))).toThrow(/non-routable/i);
    expect(() => validateLaunchClaims(ssrf('https://169.254.169.254/latest/meta-data'))).toThrow(/non-routable/i);
    expect(() => validateLaunchClaims(ssrf('not a url'))).toThrow(/invalid/i);
  });

  it('rejects a student (learner-only) launch but allows an instructor', () => {
    const learner = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner';
    const instructor = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor';
    // A student clicking the tool link must not receive the roster.
    expect(() => validateLaunchClaims({ ...valid, [LTI.ROLES]: [learner] })).toThrow(/teacher|instructor/i);
    // A teacher launch goes through.
    expect(validateLaunchClaims({ ...valid, [LTI.ROLES]: [learner, instructor] }).deploymentId).toBe('dep-1');
    // Absent roles are allowed (some platforms omit them; still signature-verified).
    expect(validateLaunchClaims(valid).deploymentId).toBe('dep-1');
  });
});

describe('assertSafeNrpsUrl', () => {
  it('passes public HTTPS endpoints through unchanged', () => {
    const url = 'https://canvas.test/api/lti/courses/1/names_and_roles';
    expect(assertSafeNrpsUrl(url)).toBe(url);
  });

  it('blocks private, loopback and link-local hosts and plain HTTP', () => {
    expect(() => assertSafeNrpsUrl('http://canvas.test/m')).toThrow(/HTTPS/i);
    expect(() => assertSafeNrpsUrl('https://localhost/m')).toThrow(/non-routable/i);
    expect(() => assertSafeNrpsUrl('https://10.0.0.5/m')).toThrow(/non-routable/i);
    expect(() => assertSafeNrpsUrl('https://192.168.1.1/m')).toThrow(/non-routable/i);
    expect(() => assertSafeNrpsUrl('https://172.16.0.1/m')).toThrow(/non-routable/i);
  });

  it('blocks bracketed IPv6 loopback / ULA / link-local and IPv4-mapped forms', () => {
    expect(() => assertSafeNrpsUrl('https://[::1]/m')).toThrow(/non-routable/i);
    expect(() => assertSafeNrpsUrl('https://[fd00::1]/m')).toThrow(/non-routable/i);
    expect(() => assertSafeNrpsUrl('https://[fc00::1]/m')).toThrow(/non-routable/i);
    expect(() => assertSafeNrpsUrl('https://[fe80::1]/m')).toThrow(/non-routable/i);
    expect(() => assertSafeNrpsUrl('https://[::ffff:127.0.0.1]/m')).toThrow(/non-routable/i);
  });

  it('still allows ordinary hostnames that merely start with fc/fd', () => {
    // The old guard wrongly rejected any host beginning "fc"/"fd"; an IPv6
    // ULA must contain a colon, so these public names must pass.
    const url = 'https://fdmoodle.school.edu/members';
    expect(assertSafeNrpsUrl(url)).toBe(url);
  });
});

describe('mapMembersToRoster', () => {
  it('keeps learners, drops instructors and inactive members', () => {
    const json = {
      members: [
        { user_id: '1', name: 'Alice Cohen', email: 'a@s.org', roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'] },
        { user_id: '2', given_name: 'Yossi', family_name: 'Levi', roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'] },
        { user_id: '3', name: 'Inactive Kid', status: 'Inactive', roles: ['...#Learner'] },
        { user_id: '4', name: 'No Roles Listed' },
      ],
    };
    const roster = mapMembersToRoster(json, 'Grade 5 Math');
    expect(roster.name).toBe('Grade 5 Math');
    expect(roster.students.map((s) => s.name).sort()).toEqual(['Alice Cohen', 'No Roles Listed']);
    expect(roster.students[0].academic_level).toBe('proficient'); // neutral defaults
  });

  it('tolerates an empty / malformed container', () => {
    expect(mapMembersToRoster({}, 'X').students).toEqual([]);
    expect(mapMembersToRoster(null, 'X').students).toEqual([]);
  });
});

describe('sanitizeRosterPayload', () => {
  it('rebuilds clean Students from untrusted fragment data, ignoring extra fields', () => {
    const out = sanitizeRosterPayload({
      name: 'Grade 5 Math',
      students: [
        { name: 'Alice', email: 'a@s.org', academic_score: 999, id: 'evil', friends_ids: ['x'] },
        { name: '  ' },        // blank → skipped
        { notName: 'Bob' },    // no name → skipped
      ],
    });
    expect(out?.name).toBe('Grade 5 Math');
    expect(out?.students).toHaveLength(1);
    // Untrusted score/id/friends are discarded; defaults applied.
    expect(out?.students[0].academic_score).toBe(70);
    expect(out?.students[0].friends_ids).toEqual([]);
    expect(out?.students[0].id).not.toBe('evil');
  });

  it('returns null for unusable payloads and caps the count', () => {
    expect(sanitizeRosterPayload(null)).toBeNull();
    expect(sanitizeRosterPayload({ students: [] })).toBeNull();
    expect(sanitizeRosterPayload({ students: 'nope' })).toBeNull();
    const many = { students: Array.from({ length: 500 }, (_, i) => ({ name: `S${i}` })) };
    expect(sanitizeRosterPayload(many, 200)?.students).toHaveLength(200);
  });
});
