// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import sessions from './surveys';
import responses from './survey-response';
import { emptyAnswers } from '../src/features/questionnaire/surveyMapping';
import type { ApiRequest, ApiResponse } from './_lib/httpTypes';

vi.mock('./_lib/rateLimit', () => ({ rateLimit: vi.fn(async () => true) }));
const records = new Map<string, string>();
const commands: unknown[][] = [];
beforeEach(() => {
  records.clear(); commands.length = 0;
  vi.stubEnv('KV_REST_API_URL', 'https://redis.test');
  vi.stubEnv('KV_REST_API_TOKEN', 'test-storage-token');
  vi.stubEnv('SURVEY_SCHOOL_KEY', 'test-school-code-32-characters-minimum');
  vi.stubEnv('SURVEY_SCHOOL_NAME', 'Test School');
  vi.stubEnv('SURVEY_PRIVACY_EMAIL', 'privacy@example.test');
  vi.stubEnv('SURVEY_PROCESSOR_NOTICE', 'Test provider, Israel; authorized school staff.');
  vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
    const args = JSON.parse(init.body) as (string | number)[];
    commands.push(args);
    let result: unknown = null;
    const key = String(args[1]);
    if (args[0] === 'SET') {
      if (!args.includes('XX') || records.has(key)) { records.set(key, String(args[2])); result = 'OK'; }
    } else if (args[0] === 'GET') result = records.get(key) ?? null;
    else if (args[0] === 'MGET') result = args.slice(1).map(k => records.get(String(k)) ?? null);
    else if (args[0] === 'DEL') { for (const k of args.slice(1)) records.delete(String(k)); result = 1; }
    return new Response(JSON.stringify({ result }), { status: 200 });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

async function call(handler: typeof sessions, method: string, auth = '', body?: Record<string, unknown>, query: Record<string, unknown> = {}) {
  let status = 0; let data: Record<string, unknown> = {};
  const headers: Record<string, string> = {};
  const res = { setHeader(k: string, v: string) { headers[k] = v; }, status(code: number) { status = code; return res; }, json(value: Record<string, unknown>) { data = value; }, send() {}, redirect() {} } as ApiResponse;
  await handler({ method, headers: { authorization: `Bearer ${auth}` }, query, body } as ApiRequest, res);
  return { status, data, headers };
}
async function create() {
  const reply = await call(sessions, 'POST', 'test-school-code-32-characters-minimum', { studentIds: ['s1', 's2'], language: 'he' });
  expect(reply.status).toBe(201);
  return reply.data as unknown as { sessionId: string; adminToken: string; invitations: { studentId: string; token: string }[] };
}

describe('Phone survey HTTP contract', () => {
  it('requires identified school and notice and permits pupil deletion without exposing others', async () => {
    vi.stubEnv('SURVEY_PRIVACY_EMAIL', '');
    expect((await call(sessions,'GET')).data.available).toBe(false);
    vi.stubEnv('SURVEY_PRIVACY_EMAIL', 'privacy@example.test');
    const survey = await create();
    const first = survey.invitations[0].token;
    const second = survey.invitations[1].token;
    expect((await call(responses,'GET',first)).data.notice).toMatchObject({schoolName:'Test School',privacyEmail:'privacy@example.test'});
    expect((await call(responses,'POST',first,{answers:emptyAnswers()})).status).toBe(400);
    expect((await call(responses,'POST',first,{answers:emptyAnswers(),noticeAcknowledged:true})).status).toBe(200);
    expect((await call(responses,'DELETE',first)).status).toBe(200);
    expect((await call(responses,'GET',first)).status).toBe(404);
    expect((await call(responses,'GET',second)).status).toBe(200);
    expect((await call(sessions,'GET',survey.adminToken,undefined,{sessionId:survey.sessionId})).data.responses).toEqual([]);
    expect(commands.some(c => c[0] === 'MGET')).toBe(true);
  });
  it('fails closed without configured durable storage and restricts methods', async () => {
    vi.stubEnv('SURVEY_SCHOOL_KEY', '');
    expect((await call(sessions, 'GET')).data).toEqual({ available: false });
    expect((await call(sessions, 'POST')).status).toBe(503);
    expect((await call(responses, 'GET')).status).toBe(503);
    const unsupported = await call(sessions, 'PATCH');
    expect(unsupported.status).toBe(405);
    expect(unsupported.headers.Allow).toBe('GET, POST, DELETE');
  });
  it('requires school authorization and validates the roster', async () => {
    expect((await call(sessions, 'POST', 'bad', { studentIds: ['s1'], language: 'he' })).status).toBe(401);
    expect((await call(sessions, 'POST', 'test-school-code-32-characters-minimum', { studentIds: ['s1', 's1'], language: 'he' })).status).toBe(400);
    expect((await call(sessions, 'POST', 'test-school-code-32-characters-minimum', { studentIds: Array.from({length: 51}, (_, i) => String(i)), language: 'he' })).status).toBe(400);
  });
  it('isolates students, protects administration and expires every stored record', async () => {
    const survey = await create();
    const first = survey.invitations[0].token;
    const second = survey.invitations[1].token;
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(commands.filter(c => c[0] === 'SET').every(c => c.includes('EX') && c.includes(604800))).toBe(true);
    expect(JSON.stringify([...records.values()])).not.toContain(first);
    const publicView = await call(responses, 'GET', first);
    expect(publicView.headers['Cache-Control']).toBe('no-store');
    expect(publicView.data).not.toHaveProperty('studentId');
    expect(publicView.data).not.toHaveProperty('answers');
    const answers = { ...emptyAnswers(), noise: 4, teacherAttention: 2 };
    expect((await call(responses, 'POST', first, { answers, noticeAcknowledged:true })).status).toBe(200);
    expect((await call(responses, 'GET', second)).data.submitted).toBe(false);
    expect((await call(sessions, 'GET', first, undefined, { sessionId: survey.sessionId })).status).toBe(404);
    const collected = await call(sessions, 'GET', survey.adminToken, undefined, { sessionId: survey.sessionId });
    expect(collected.data.responses).toEqual([{ studentId: 's1', answers }]);
    expect((await call(responses, 'POST', first, { noticeAcknowledged:true, answers: { ...answers, noise: 99 } })).status).toBe(400);
    expect((await call(responses, 'POST', first, { noticeAcknowledged:true, answers: { ...answers, seatmates: ['s2'] } })).status).toBe(400);
    expect((await call(sessions, 'DELETE', survey.adminToken, undefined, { sessionId: survey.sessionId })).status).toBe(200);
    expect((await call(responses, 'POST', first, { answers, noticeAcknowledged:true })).status).toBe(404);
    expect(records.size).toBe(0);
  });
  it('returns 503 on storage outage without falling back to process memory', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('outage'); }));
    expect((await call(sessions, 'POST', 'test-school-code-32-characters-minimum', { studentIds: ['s1'], language: 'he' })).status).toBe(503);
  });
});
