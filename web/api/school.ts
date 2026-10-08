import type { ApiRequest, ApiResponse } from './_lib/httpTypes';
import { rateLimit } from './_lib/rateLimit.js';
import { createHash, randomBytes } from 'node:crypto';

const ACCESS_COOKIE = '__Host-seatai-school-access';
const REFRESH_COOKIE = '__Host-seatai-school-refresh';
const RECOVERY_VERIFIER_COOKIE = '__Host-seatai-school-recovery-verifier';
const RECOVERY_COOKIE = '__Host-seatai-school-recovery';
const ROLES = ['teacher', 'counselor', 'principal'];
const COMMANDS = ['publish_class', 'create_referral', 'recommend', 'private_note', 'outcome', 'set_status', 'grant_member', 'revoke_member'];
class HttpError extends Error { constructor(public status: number, public code: string) { super(code); } }
function header(req: ApiRequest, name: string) { const v = req.headers[name]; return Array.isArray(v) ? v[0] : v; }
function configuration() {
  const url = process.env.SEATAI_SUPABASE_URL;
  const key = process.env.SEATAI_SUPABASE_PUBLISHABLE_KEY;
  // Never accept a caller-supplied upstream or a service-role key. All DB calls carry the user's token.
  if (!url || !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url) || !key || !key.startsWith('sb_publishable_')) return null;
  return { url, key };
}
function cookies(req: ApiRequest) {
  const values = new Map<string, string>();
  for (const pair of (header(req, 'cookie') ?? '').split(';')) {
    const index = pair.indexOf('=');
    if (index > 0) values.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
  return values;
}
const cookie = (name: string, value: string, age: number) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
function setSession(res: ApiResponse, access: string, refresh: string) {
  res.setHeader('Set-Cookie', [cookie(ACCESS_COOKIE, access, access ? 900 : 0), cookie(REFRESH_COOKIE, refresh, refresh ? 1800 : 0)]);
}
async function upstream(path: string, body?: unknown, access?: string, method?: string) {
  const config = configuration()!;
  const reply = await fetch(`${config.url}${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: { apikey: config.key, 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(12_000), redirect: 'error', cache: 'no-store',
  });
  const data = reply.status === 204 ? {} : await reply.json() as Record<string, unknown>;
  if (!reply.ok) {
    const code = String(data.code ?? data.error_code ?? '');
    if (['P0001', '22023', '22P02', '23514', '23505', '23503', '23502'].includes(code)) throw new HttpError(400, 'invalid_request');
    if (['42501', 'PGRST301', 'PGRST302'].includes(code)) throw new HttpError(403, 'forbidden');
    if (reply.status === 429) throw new HttpError(429, 'rate_limited');
    if (['weak_password', 'same_password'].includes(code)) throw new HttpError(400, 'password_rejected');
    if (reply.status >= 500 || code.startsWith('PGRST2')) throw new HttpError(503, 'unavailable');
    throw new HttpError(401, 'unauthorized');
  }
  return data;
}
function mfaVerified(access: string) {
  try { return JSON.parse(Buffer.from(access.split('.')[1], 'base64url').toString()).aal === 'aal2'; }
  catch { return false; }
}
async function accessToken(req: ApiRequest, res: ApiResponse) {
  const jar = cookies(req);
  let access = jar.get(ACCESS_COOKIE);
  const refresh = jar.get(REFRESH_COOKIE);
  if (access) {
    try { await upstream('/auth/v1/user', undefined, access); return access; }
    catch (error) { if (!(error instanceof HttpError) || error.status !== 401) throw error; }
  }
  if (!refresh) { setSession(res, '', ''); throw new HttpError(401, 'unauthorized'); }
  try {
    const session = await upstream('/auth/v1/token?grant_type=refresh_token', { refresh_token: refresh });
    access = String(session.access_token); setSession(res, access, String(session.refresh_token));
    return access;
  } catch (error) { if (error instanceof HttpError && error.status === 401) setSession(res, '', ''); throw error; }
}
export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Cookie');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ error: 'method_not_allowed' }); return; }
  // Cookies authenticate requests, so verify the browser origin before *every* action, including login.
  const origin = header(req, 'origin');
  const host = header(req, 'host');
  if (!origin || !host || origin !== `https://${host}` || header(req, 'sec-fetch-site') === 'cross-site') { res.status(403).json({ error: 'forbidden' }); return; }
  if (!header(req, 'content-type')?.startsWith('application/json')) { res.status(400).json({ error: 'invalid_request' }); return; }
  const action = req.body?.action;
  if (!configuration()) { res.status(action === 'bootstrap' ? 200 : 503).json(action === 'bootstrap' ? { available: false, memberships: [], signedIn: false } : { error: 'unavailable' }); return; }
  try {
    if (JSON.stringify(req.body ?? {}).length > 90_000) throw new HttpError(413, 'invalid_request');
    const authAction = ['login', 'register', 'mfa_setup', 'mfa_verify', 'recover_password', 'exchange_recovery', 'recovery_status', 'recovery_verify', 'reset_password'].includes(String(action));
    if (!(await rateLimit(req, res, { prefix: authAction ? 'school-auth' : 'school', maximum: authAction ? 10 : 120 }))) return;
    if (action === 'recover_password') {
      const email = req.body?.email;
      if (typeof email !== 'string' || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email.trim())) throw new HttpError(400, 'invalid_request');
      const verifier = randomBytes(32).toString('base64url');
      const challenge = createHash('sha256').update(verifier).digest('base64url');
      // Supabase returns the same success for unknown addresses. Never accept a caller-selected redirect.
      await upstream(`/auth/v1/recover?redirect_to=${encodeURIComponent(`${origin}/#school-reset`)}`, { email: email.trim(), code_challenge: challenge, code_challenge_method: 's256' });
      res.setHeader('Set-Cookie', [cookie(RECOVERY_VERIFIER_COOKIE, verifier, 3600), cookie(RECOVERY_COOKIE, '', 0)]);
      res.status(200).json({ ok: true }); return;
    }
    if (action === 'exchange_recovery') {
      const code = req.body?.code;
      const verifier = cookies(req).get(RECOVERY_VERIFIER_COOKIE);
      if (typeof code !== 'string' || !/^[a-f0-9-]{36}$/i.test(code)) throw new HttpError(400, 'invalid_request');
      if (!verifier || !/^[A-Za-z0-9_-]{43}$/.test(verifier)) throw new HttpError(401, 'unauthorized');
      const session = await upstream('/auth/v1/token?grant_type=pkce', { auth_code: code, code_verifier: verifier });
      if (typeof session.access_token !== 'string' || !/^[A-Za-z0-9_.-]+$/.test(session.access_token)) throw new HttpError(503, 'unavailable');
      const user = await upstream('/auth/v1/user', undefined, session.access_token);
      const factors = (user.factors ?? []) as { status: string }[];
      res.setHeader('Set-Cookie', [cookie(RECOVERY_VERIFIER_COOKIE, '', 0), cookie(RECOVERY_COOKIE, session.access_token, 900)]);
      res.status(200).json({ ok: true, mfaRequired: factors.some(f => f.status === 'verified') && !mfaVerified(session.access_token) }); return;
    }
    if (action === 'recovery_status' || action === 'recovery_verify' || action === 'reset_password') {
      const recoveryAccess = cookies(req).get(RECOVERY_COOKIE);
      if (!recoveryAccess) throw new HttpError(401, 'unauthorized');
      const user = await upstream('/auth/v1/user', undefined, recoveryAccess);
      const factors = (user.factors ?? []) as { id: string; status: string; factor_type: string }[];
      const mfaRequired = factors.some(f => f.status === 'verified') && !mfaVerified(recoveryAccess);
      if (action === 'recovery_status') { res.status(200).json({ ok: true, mfaRequired }); return; }
      if (action === 'recovery_verify') {
        const code = req.body?.code;
        const factor = factors.find(f => f.status === 'verified' && f.factor_type === 'totp');
        if (typeof code !== 'string' || !/^\d{6}$/.test(code) || !factor) throw new HttpError(400, 'invalid_request');
        const challenge = await upstream(`/auth/v1/factors/${factor.id}/challenge`, {}, recoveryAccess);
        const session = await upstream(`/auth/v1/factors/${factor.id}/verify`, { challenge_id: challenge.id, code }, recoveryAccess);
        if (typeof session.access_token !== 'string' || !/^[A-Za-z0-9_.-]+$/.test(session.access_token) || !mfaVerified(session.access_token)) throw new HttpError(401, 'unauthorized');
        res.setHeader('Set-Cookie', cookie(RECOVERY_COOKIE, session.access_token, 900));
        res.status(200).json({ ok: true }); return;
      }
      if (action === 'reset_password') {
        if (mfaRequired) throw new HttpError(403, 'mfa_required');
        const password = req.body?.password;
        if (typeof password !== 'string' || password.length < 12 || password.length > 128) throw new HttpError(400, 'invalid_request');
        await upstream('/auth/v1/user', { password }, recoveryAccess, 'PUT');
        // A successful reset returns to regular sign-in, including the existing MFA gate.
        try { await upstream('/auth/v1/logout?scope=local', {}, recoveryAccess); } catch { /* Password already changed; local recovery credentials still expire. */ }
        res.setHeader('Set-Cookie', [cookie(RECOVERY_COOKIE, '', 0), cookie(RECOVERY_VERIFIER_COOKIE, '', 0), cookie(ACCESS_COOKIE, '', 0), cookie(REFRESH_COOKIE, '', 0)]);
      }
      res.status(200).json({ ok: true }); return;
    }
    if (action === 'login' || action === 'register') {
      const { email, password } = req.body!;
      if (typeof email !== 'string' || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 12 || password.length > 128) throw new HttpError(400, 'invalid_request');
      const session = await upstream(action === 'login' ? '/auth/v1/token?grant_type=password' : '/auth/v1/signup', { email: email.trim(), password });
      if (action === 'login') setSession(res, String(session.access_token), String(session.refresh_token));
      // Registration never grants a role or creates a school. Email verification is configured in Supabase.
      res.status(200).json({ ok: true }); return;
    }
    if (action === 'logout') {
      const access = cookies(req).get(ACCESS_COOKIE);
      setSession(res, '', '');
      if (access) { try { await upstream('/auth/v1/logout?scope=local', {}, access); } catch { /* local cookies still expire */ } }
      res.status(200).json({ ok: true }); return;
    }
    let access: string;
    try { access = await accessToken(req, res); }
    catch (error) { if (action === 'bootstrap' && error instanceof HttpError && error.status === 401) { res.status(200).json({ available: true, memberships: [], signedIn: false }); return; } throw error; }
    if (action === 'mfa_setup') {
      const user = await upstream('/auth/v1/user', undefined, access);
      const factors = (user.factors ?? []) as { id: string; status: string; factor_type: string }[];
      const verified = factors.find(f => f.factor_type === 'totp' && f.status === 'verified');
      if (verified) { res.status(200).json({ factorId: verified.id }); return; }
      // An abandoned enrollment is unverified; remove only those factors belonging to this user.
      for (const factor of factors.filter(f => f.factor_type === 'totp' && f.status === 'unverified')) await upstream(`/auth/v1/factors/${factor.id}`, undefined, access, 'DELETE');
      const enrollment = await upstream('/auth/v1/factors', { factor_type: 'totp', friendly_name: 'SeatAI' }, access);
      const totp = enrollment.totp as { qr_code: string; secret: string };
      res.status(200).json({ factorId: enrollment.id, qrCode: totp.qr_code, secret: totp.secret }); return;
    }
    if (action === 'mfa_verify') {
      const { factorId, code } = req.body!;
      if (typeof factorId !== 'string' || !/^[a-f0-9-]{36}$/.test(factorId) || typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new HttpError(400, 'invalid_request');
      const challenge = await upstream(`/auth/v1/factors/${factorId}/challenge`, {}, access);
      const session = await upstream(`/auth/v1/factors/${factorId}/verify`, { challenge_id: challenge.id, code }, access);
      setSession(res, String(session.access_token), String(session.refresh_token));
      res.status(200).json({ ok: true }); return;
    }
    if (action === 'bootstrap') {
      const [data, user] = await Promise.all([upstream('/rest/v1/rpc/seatai_bootstrap', {}, access), upstream('/auth/v1/user', undefined, access)]);
      const factors = (user.factors ?? []) as { status: string }[];
      res.status(200).json({ available: true, signedIn: true, memberships: data, mfaRequired: !mfaVerified(access) || !factors.some(f => f.status === 'verified') }); return;
    }
    if (action === 'create_school') {
      const payload = req.body?.payload as Record<string, unknown> | undefined;
      if (!payload || payload.noticeAcknowledged !== true) throw new HttpError(400, 'invalid_request');
      const data = await upstream('/rest/v1/rpc/seatai_command', { p_school: null, p_role: 'principal', p_action: 'create_school', p_payload: payload }, access);
      res.status(200).json(data); return;
    }
    const context = req.body?.context as Record<string, unknown> | undefined;
    if (!context || typeof context.schoolId !== 'string' || !/^[a-f0-9-]{36}$/.test(context.schoolId) || !ROLES.includes(String(context.role))) throw new HttpError(400, 'invalid_request');
    if (action === 'workspace') { const data = await upstream('/rest/v1/rpc/seatai_workspace', { p_school: context.schoolId, p_role: context.role }, access); res.status(200).json(data); return; }
    if (action === 'command') {
      const command = req.body?.command as Record<string, unknown> | undefined;
      if (!command || !COMMANDS.includes(String(command.action)) || !command.payload || typeof command.payload !== 'object' || Array.isArray(command.payload)) throw new HttpError(400, 'invalid_request');
      // Context and role are inputs to authorization, never proof of authorization. SQL verifies live memberships and assignments.
      const data = await upstream('/rest/v1/rpc/seatai_command', { p_school: context.schoolId, p_role: context.role, p_action: command.action, p_payload: command.payload }, access);
      res.status(200).json(data); return;
    }
    throw new HttpError(400, 'invalid_request');
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 503;
    res.status(status).json({ error: error instanceof HttpError ? error.code : 'unavailable' });
  }
}
