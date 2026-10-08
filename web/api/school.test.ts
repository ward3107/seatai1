// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './school';
import type { ApiRequest, ApiResponse } from './_lib/httpTypes';
import { createHash } from 'node:crypto';
import { rateLimit } from './_lib/rateLimit';
vi.mock('./_lib/rateLimit', () => ({ rateLimit: vi.fn(async () => true) }));
const calls: { url: string; init?: RequestInit }[] = [];
beforeEach(() => {
  calls.length = 0;
  vi.mocked(rateLimit).mockImplementation(async () => true);
  vi.stubEnv('SEATAI_SUPABASE_URL', 'https://abcdefghijklmnopqrst.supabase.co');
  vi.stubEnv('SEATAI_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test_only');
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.includes('/token?')) return new Response(JSON.stringify({ access_token: 'test-access', refresh_token: 'test-refresh' }));
    if (url.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'verified-user' }));
    if (url.includes('seatai_bootstrap')) return new Response(JSON.stringify([]));
    return new Response(JSON.stringify({ ok: true }));
  }));
});

describe('Password recovery HTTP contract', () => {
  const recoveryCookie = '__Host-seatai-school-recovery=recovery-access';
  const code = '00000000-0000-4000-8000-000000000001';
  it('sends a PKCE challenge and pins the redirect without disclosing account existence or the verifier', async () => {
    const response = await call({ action: 'recover_password', email: ' teacher@school.test ', redirectTo: 'https://attacker.test' });
    expect(response.status).toBe(200); expect(response.data).toEqual({ ok: true });
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe('/auth/v1/recover');
    expect(url.searchParams.get('redirect_to')).toBe('https://seatai.test/#school-reset');
    const jar = response.headers['Set-Cookie'] as string[];
    const verifier = jar[0].split(';')[0].split('=')[1];
    expect(jar[0]).toContain('HttpOnly; Secure; SameSite=Strict; Max-Age=3600');
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ email: 'teacher@school.test', code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 's256' });
    expect(JSON.stringify(response.data)).not.toContain(verifier);
    expect((await call({ action: 'recover_password', email: 'not-found@school.test' })).data).toEqual(response.data);
  });
  it('validates the address and applies the same origin and authentication rate limits', async () => {
    expect((await call({ action: 'recover_password', email: 'invalid' })).status).toBe(400);
    expect((await call({ action: 'recover_password', email: 'a@b.test' }, { origin: 'https://attacker.test' })).status).toBe(403);
    expect(calls).toHaveLength(0);
    vi.mocked(rateLimit).mockImplementation(async (_req, res) => { res.status(429).send('Too many requests'); return false; });
    expect((await call({ action: 'recover_password', email: 'a@b.test' })).status).toBe(429);
    expect(vi.mocked(rateLimit).mock.calls.at(-1)?.[2]).toEqual({ prefix: 'school-auth', maximum: 10 });
    expect(calls).toHaveLength(0);
  });
  it('exchanges only with the browser verifier and creates no normal staff session', async () => {
    expect((await call({ action: 'exchange_recovery', code })).status).toBe(401);
    expect((await call({ action: 'exchange_recovery', code: 'invalid' })).status).toBe(400);
    const verifier = 'a'.repeat(43);
    const response = await call({ action: 'exchange_recovery', code }, { cookie: `__Host-seatai-school-recovery-verifier=${verifier}` });
    expect(response.status).toBe(200); expect(response.data).toEqual({ ok: true, mfaRequired: false });
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ auth_code: code, code_verifier: verifier });
    const jar = response.headers['Set-Cookie'] as string[];
    expect(jar).toHaveLength(2);
    expect(jar[0]).toContain('Max-Age=0');
    expect(jar[1]).toContain('__Host-seatai-school-recovery=test-access;');
    expect(jar[1]).toContain('HttpOnly; Secure; SameSite=Strict; Max-Age=900');
    expect(jar.join()).not.toContain('__Host-seatai-school-access=');
    expect(jar.join()).not.toContain('test-refresh');
    expect((await call({ action: 'bootstrap' }, { cookie: recoveryCookie })).data).toMatchObject({ signedIn: false });
  });
  it('rejects expired or replayed codes and never returns provider details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error_code: 'flow_state_not_found', message: 'PRIVATE detail' }), { status: 403 })));
    const result = await call({ action: 'exchange_recovery', code }, { cookie: `__Host-seatai-school-recovery-verifier=${'a'.repeat(43)}` });
    expect(result.status).toBe(401); expect(result.data).toEqual({ error: 'unauthorized' });
    expect(result.headers['Set-Cookie']).toBeUndefined();
  });
  it('requires a verified recovery session and updates only its user before clearing cookies', async () => {
    expect((await call({ action: 'reset_password', password: 'long-new-password' }, { cookie: '__Host-seatai-school-access=ordinary-session' })).status).toBe(401);
    expect((await call({ action: 'recovery_status' }, { cookie: recoveryCookie })).status).toBe(200);
    const result = await call({ action: 'reset_password', password: 'long-new-password', userId: 'someone-else' }, { cookie: recoveryCookie });
    expect(result.status).toBe(200);
    const put = calls.find(c => c.init?.method === 'PUT')!;
    expect(put.url).toContain('/auth/v1/user');
    expect(put.init?.headers).toMatchObject({ Authorization: 'Bearer recovery-access' });
    expect(JSON.parse(String(put.init?.body))).toEqual({ password: 'long-new-password' });
    expect((result.headers['Set-Cookie'] as string[])).toHaveLength(4);
    expect((result.headers['Set-Cookie'] as string[]).every(c => c.includes('Max-Age=0'))).toBe(true);
    expect(calls.some(c => c.url.includes('/rest/') || c.url.includes('/factors'))).toBe(false);
  });
  it('rejects invalid sessions, short passwords and provider-rejected passwords', async () => {
    expect((await call({ action: 'reset_password', password: 'short' }, { cookie: recoveryCookie })).status).toBe(400);
    expect(calls.some(c => c.init?.method === 'PUT')).toBe(false);
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => new Response(JSON.stringify(init?.method === 'PUT' ? { code: 'same_password', message: 'PRIVATE' } : { id: 'verified-user' }), { status: init?.method === 'PUT' ? 422 : 200 })));
    expect((await call({ action: 'reset_password', password: 'long-new-password' }, { cookie: recoveryCookie })).data).toEqual({ error: 'password_rejected' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    expect((await call({ action: 'reset_password', password: 'long-new-password' }, { cookie: recoveryCookie })).status).toBe(401);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });
  it('preserves existing MFA during recovery and never enrolls a factor or creates a staff session', async () => {
    const verifiedToken = `header.${Buffer.from(JSON.stringify({ aal: 'aal2' })).toString('base64url')}.signature`;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const data = url.endsWith('/auth/v1/user') ? { factors: [{ id: 'existing-factor', factor_type: 'totp', status: 'verified' }] } : url.endsWith('/challenge') ? { id: 'challenge' } : { access_token: verifiedToken, refresh_token: 'not-for-the-browser' };
      return new Response(JSON.stringify(data));
    }));
    expect((await call({ action: 'recovery_status' }, { cookie: recoveryCookie })).data).toEqual({ ok: true, mfaRequired: true });
    expect((await call({ action: 'reset_password', password: 'long-new-password' }, { cookie: recoveryCookie })).data).toEqual({ error: 'mfa_required' });
    expect(calls.some(c => c.init?.method === 'PUT')).toBe(false);
    const result = await call({ action: 'recovery_verify', code: '123456', factorId: 'attacker-factor' }, { cookie: recoveryCookie });
    expect(result.status).toBe(200);
    expect(result.headers['Set-Cookie']).toBe(`__Host-seatai-school-recovery=${verifiedToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900`);
    expect(calls.at(-1)?.url).toContain('/factors/existing-factor/verify');
    expect(JSON.parse(String(calls.at(-1)?.init?.body))).toEqual({ challenge_id: 'challenge', code: '123456' });
    expect((await call({ action: 'reset_password', password: 'long-new-password' }, { cookie: `__Host-seatai-school-recovery=${verifiedToken}` })).status).toBe(200);
    expect(calls.some(c => c.url.endsWith('/factors') || c.init?.method === 'DELETE')).toBe(false);
  });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
async function call(body: Record<string, unknown>, extras: Record<string, string> = {}, method = 'POST') {
  let status = 0; let data: unknown;
  const headers: Record<string, string | string[]> = {};
  const response = { setHeader(k: string, v: string | string[]) { headers[k] = v; }, status(code: number) { status = code; return response; }, json(value: unknown) { data = value; }, send(value: string) { data = value; }, redirect() {} } as ApiResponse;
  await handler({ method, body, query: {}, headers: { origin: 'https://seatai.test', host: 'seatai.test', 'content-type': 'application/json', ...extras } as ApiRequest['headers'] }, response);
  return { status, data, headers };
}
describe('School same-origin HTTP contract', () => {
  it('fails closed without a dedicated backend and rejects secret keys or arbitrary upstreams', async () => {
    vi.stubEnv('SEATAI_SUPABASE_URL', '');
    expect((await call({ action: 'bootstrap' })).data).toEqual({ available: false, signedIn: false, memberships: [] });
    expect((await call({ action: 'login' })).status).toBe(503);
    vi.stubEnv('SEATAI_SUPABASE_URL', 'https://internal.example');
    expect((await call({ action: 'bootstrap' })).data).toHaveProperty('available', false);
    vi.stubEnv('SEATAI_SUPABASE_URL', 'https://abcdefghijklmnopqrst.supabase.co');
    vi.stubEnv('SEATAI_SUPABASE_PUBLISHABLE_KEY', 'sb_secret_never_client');
    expect((await call({ action: 'bootstrap' })).data).toHaveProperty('available', false);
    expect(calls).toEqual([]);
  });
  it('requires same-origin JSON for login and cookie-authenticated actions', async () => {
    expect((await call({ action: 'bootstrap' }, { origin: 'https://attacker.test' })).status).toBe(403);
    expect((await call({ action: 'bootstrap' }, { origin: '' })).status).toBe(403);
    expect((await call({ action: 'bootstrap' }, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    expect((await call({ action: 'login' }, { 'content-type': 'text/plain' })).status).toBe(400);
    expect((await call({ action: 'bootstrap' }, {}, 'GET')).status).toBe(405);
    expect(calls).toEqual([]);
  });
  it('keeps tokens out of JSON and uses Secure HttpOnly host-only cookies', async () => {
    const result = await call({ action: 'login', email: 'teacher@school.test', password: 'long-test-password' });
    expect(result.status).toBe(200); expect(result.data).toEqual({ ok: true });
    const cookies = result.headers['Set-Cookie'] as string[];
    expect(cookies).toHaveLength(2);
    expect(cookies.every(c => c.includes('__Host-') && c.includes('HttpOnly; Secure; SameSite=Strict') && !c.includes('Domain='))).toBe(true);
    expect(result.headers['Cache-Control']).toBe('private, no-store');
    expect(JSON.stringify(result.data)).not.toContain('test-access');
  });
  it('validates Auth before every RPC and uses only the user JWT with a publishable key', async () => {
    const result = await call({ action: 'workspace', context: { schoolId: '00000000-0000-4000-8000-000000000001', role: 'teacher' } }, { cookie: '__Host-seatai-school-access=test-access' });
    expect(result.status).toBe(200); expect(calls[0].url).toContain('/auth/v1/user');
    expect(calls[1].url).toContain('/rest/v1/rpc/seatai_workspace');
    expect(calls[1].init?.headers).toMatchObject({ Authorization: 'Bearer test-access', apikey: 'sb_publishable_test_only' });
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ p_school: '00000000-0000-4000-8000-000000000001', p_role: 'teacher' });
    expect((await call({ action: 'workspace' })).status).toBe(401);
  });
  it('refreshes expired sessions and revokes local cookies on logout', async () => {
    const result = await call({ action: 'bootstrap' }, { cookie: '__Host-seatai-school-refresh=test-refresh' });
    expect(result.status).toBe(200); expect(calls[0].url).toContain('grant_type=refresh_token'); expect(result.headers['Set-Cookie']).toHaveLength(2);
    const logout = await call({ action: 'logout' }, { cookie: '__Host-seatai-school-access=test-access' });
    expect((logout.headers['Set-Cookie'] as string[]).every(c => c.includes('Max-Age=0'))).toBe(true);
    expect(calls.at(-1)?.url).toContain('/logout?scope=local');
  });
  it('does not grant roles during signup and sanitizes upstream failures', async () => {
    expect((await call({ action: 'register', email: 'teacher@school.test', password: 'long-test-password', role: 'principal' })).status).toBe(200);
    expect(calls).toHaveLength(1); expect(calls[0].url).toContain('/auth/v1/signup'); expect(JSON.parse(String(calls[0].init?.body))).not.toHaveProperty('role');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: '42501', message: 'CONFIDENTIAL internals' }), { status: 403 })));
    const denial = await call({ action: 'workspace', context: { schoolId: '00000000-0000-4000-8000-000000000001', role: 'principal' } }, { cookie: '__Host-seatai-school-access=test-access' });
    expect(denial.status).toBe(403); expect(denial.data).toEqual({ error: 'forbidden' });
    expect(JSON.stringify(denial.data)).not.toContain('CONFIDENTIAL');
  });
  it('enrolls and verifies MFA without exposing session tokens', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const data = url.endsWith('/auth/v1/user') ? { factors: [] } : url.endsWith('/factors') ? { id: '00000000-0000-4000-8000-000000000001', totp: { qr_code: '<svg/>', secret: 'TESTONLY' } } : url.endsWith('/challenge') ? { id: 'test-challenge' } : { access_token: 'verified-test-access', refresh_token: 'verified-test-refresh' };
      return new Response(JSON.stringify(data));
    }));
    const headers = { cookie: '__Host-seatai-school-access=test-access' };
    expect((await call({ action: 'mfa_setup' }, headers)).data).toMatchObject({ factorId: '00000000-0000-4000-8000-000000000001', secret: 'TESTONLY' });
    const verified = await call({ action: 'mfa_verify', factorId: '00000000-0000-4000-8000-000000000001', code: '123456' }, headers);
    expect(verified.data).toEqual({ ok: true });
    expect(JSON.parse(String(calls.at(-1)?.init?.body))).toEqual({ challenge_id: 'test-challenge', code: '123456' });
    expect(verified.headers['Set-Cookie']).toHaveLength(2);
    expect((await call({ action: 'mfa_verify', factorId: 'invalid', code: '123456' }, headers)).status).toBe(400);
  });
});
