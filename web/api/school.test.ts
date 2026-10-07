// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './school';
import type { ApiRequest, ApiResponse } from './_lib/httpTypes';
vi.mock('./_lib/rateLimit', () => ({ rateLimit: vi.fn(async () => true) }));
const calls: { url: string; init?: RequestInit }[] = [];
beforeEach(() => {
  calls.length = 0;
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
