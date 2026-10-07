// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SchoolWorkspace } from './types';

const db = new PGlite();
const users = { principal: '00000000-0000-4000-8000-000000000001', teacher: '00000000-0000-4000-8000-000000000002', counselor: '00000000-0000-4000-8000-000000000003', outsider: '00000000-0000-4000-8000-000000000004', expired: '00000000-0000-4000-8000-000000000005' };
const session = (user: string) => user.replace('00000000-', '10000000-');
let school: string; let otherSchool: string; let classId: string; let otherClassId: string; let pupil: string; let referral: string;
async function actor(user: string, extra: Record<string, unknown> = {}) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: user, session_id: session(user), aal: 'aal2', ...extra })]);
  await db.exec('set role authenticated');
}
async function command(role: string, action: string, payload: unknown, target: string | null = school) {
  return (await db.query<{ result: { schoolId: string } }>('select public.seatai_command($1,$2,$3,$4::jsonb) result', [target, role, action, JSON.stringify(payload)])).rows[0].result;
}
async function workspace(role: string, target = school) {
  return (await db.query<{ result: SchoolWorkspace }>('select public.seatai_workspace($1,$2) result', [target, role])).rows[0].result;
}
beforeAll(async () => {
  await db.exec(`create role authenticated; create role anon; create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean);
    create table auth.sessions(id uuid primary key,user_id uuid);
    create table auth.mfa_factors(id uuid primary key,user_id uuid,status text);
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    grant usage on schema auth to authenticated,anon;`);
  for (const [name, user] of Object.entries(users)) {
    await db.query('insert into auth.users values($1,$2,now(),false)', [user, `${name}@school.test`]);
    await db.query('insert into auth.sessions values($1,$2)', [session(user), user]);
    await db.query('insert into auth.mfa_factors values($1,$2,$3)', [session(user), user, 'verified']);
  }
  const dir = resolve(process.cwd(), '../supabase/migrations');
  for (const migration of readdirSync(dir).filter(name => name.endsWith('.sql')).sort()) await db.exec(readFileSync(resolve(dir, migration), 'utf8'));
  await actor(users.principal);
  school = (await command('principal', 'create_school', { name: 'School A', displayName: 'Principal A', notice: 'School-approved pilot notice.', noticeAcknowledged: true }, null)).schoolId;
  await command('principal', 'grant_member', { email: 'teacher@school.test', displayName: 'Teacher A', role: 'teacher', classIds: [], expiresAt: null });
  await actor(users.teacher);
  await command('teacher', 'publish_class', { name: 'Class A', students: [{ name: 'Student A', localRef: 'a', notes: 'DO NOT UPLOAD', surveyAnswers: { private: true } }], snapshot: { rows: 2, cols: 2, positions: [{ localRef: 'a', row: 0, col: 0, secret: 'DO NOT UPLOAD' }], notes: 'DO NOT UPLOAD' } });
  const initial = await workspace('teacher'); classId = initial.classes[0].id; pupil = initial.classes[0].students[0].id;
  await command('teacher', 'create_referral', { classId, studentId: pupil, title: 'Class support', detail: 'Strengths and an observation.' });
  referral = (await workspace('teacher')).referrals[0].id;
  await actor(users.principal);
  await command('principal', 'grant_member', { email: 'counselor@school.test', displayName: 'Counselor A', role: 'counselor', classIds: [classId], expiresAt: null });
  await actor(users.counselor);
  await command('counselor', 'private_note', { referralId: referral, body: 'CONFIDENTIAL MEETING' });
  await command('counselor', 'recommend', { referralId: referral, body: 'Quiet seat.', goal: 'Complete a task.', reviewDate: '2099-01-01' });
  await actor(users.outsider);
  otherSchool = (await command('principal', 'create_school', { name: 'School B', displayName: 'Principal B', notice: 'A separate school notice.', noticeAcknowledged: true }, null)).schoolId;
  await command('principal', 'grant_member', { email: 'outsider@school.test', displayName: 'Teacher B', role: 'teacher', classIds: [], expiresAt: null }, otherSchool);
  await command('teacher', 'publish_class', { name: 'Class B', students: [{ name: 'Student B', localRef: 'b' }], snapshot: { rows: 1, cols: 1, positions: [] } }, otherSchool);
  otherClassId = (await workspace('teacher', otherSchool)).classes[0].id;
}, 90_000);
afterAll(async () => { await db.close(); });

describe('School database authorization on real Postgres policies and RPCs', () => {
  it('gives new workspace creators administration only and identifies the owner', async () => {
    await actor(users.principal);
    const memberships = (await db.query<{ result: { role: string; isOwner: boolean }[] }>('select public.seatai_bootstrap() result')).rows[0].result;
    expect(memberships.map(m => m.role)).toEqual(['principal']);
    expect(memberships[0].isOwner).toBe(true);
    await expect(workspace('teacher')).rejects.toThrow('forbidden');
  });
  it('stores the same bounded optimization report for authorized roles without individual profiles', async () => {
    await actor(users.teacher);
    const report = { version: 1, generatedAt: '2026-10-07T12:00:00Z', score: 999, objectives: { academic_balance: 80, behavioral_balance: 70, diversity: 60, special_needs: 90, private: 'SECRET' }, seated: 999, missing: 999, needsAttention: 1, requiredAttention: 0, generations: 20, durationMs: 42, layoutType: 'circle', strategy: 'mixed', notes: 'SECRET' };
    const payload = { classId, name: 'Class A', students: [{ localRef: 'a', name: 'Student A' }], snapshot: { rows: 2, cols: 2, positions: [{ localRef: 'a', row: 0, col: 0, x: .5, y: .2 }] }, optimization: report };
    await command('teacher', 'publish_class', payload);
    for (const role of ['teacher', 'counselor', 'principal'] as const) {
      await actor(users[role]);
      const c = (await workspace(role)).classes[0];
      expect(c.optimization).toMatchObject({ score: 75, seated: 1, missing: 0 });
      expect(c.snapshot?.positions[0]).toMatchObject({ x: .5, y: .2 });
      expect(JSON.stringify(c)).not.toContain('SECRET');
    }
    await actor(users.teacher);
    await expect(command('teacher', 'publish_class', { ...payload, optimization: { ...report, objectives: { ...report.objectives, diversity: 101 } } })).rejects.toThrow('invalid_request');
    await expect(command('teacher', 'publish_class', { ...payload, snapshot: { ...payload.snapshot, positions: [{ localRef: 'a', row: 0, col: 0, x: 2, y: .2 }] } })).rejects.toThrow('invalid_request');
    expect((await workspace('teacher')).classes[0].optimization?.score).toBe(75);
  });
  it('lets a principal publish in their school without silently granting a teacher role', async () => {
    await actor(users.principal);
    const own = (await command('principal', 'create_school', { name: 'Owner publishing', displayName: 'Owner', notice: 'Authorized test workspace.', noticeAcknowledged: true }, null)).schoolId;
    await command('principal', 'publish_class', { name: 'Owned class', students: [{ name: 'Sample pupil', localRef: 'local' }], snapshot: { rows: 1, cols: 1, positions: [] } }, own);
    expect((await workspace('principal', own)).classes[0].studentCount).toBe(1);
    await expect(workspace('teacher', own)).rejects.toThrow('forbidden');
    await actor(users.counselor);
    await expect(workspace('counselor', own)).rejects.toThrow('forbidden');
  });
  it('projects teacher, counselor and principal data with separate confidentiality', async () => {
    await actor(users.teacher); const teacher = await workspace('teacher');
    expect(teacher.referrals).toHaveLength(1); expect(teacher.privateNotes).toEqual([]); expect(teacher.recommendations[0].body).toBe('Quiet seat.');
    expect(JSON.stringify(teacher)).not.toContain('DO NOT UPLOAD');
    expect(JSON.stringify(teacher)).not.toContain('CONFIDENTIAL MEETING');
    await actor(users.counselor); expect((await workspace('counselor')).privateNotes[0].body).toBe('CONFIDENTIAL MEETING');
    await actor(users.principal); const principal = await workspace('principal');
    expect(principal.summary.activeCases).toBe(1); expect(principal.referrals).toEqual([]); expect(principal.privateNotes).toEqual([]); expect(principal.classes[0].students[0].name).toBe('Student A');
    expect(principal.classes[0].snapshot?.positions).toHaveLength(1); expect(JSON.stringify(principal)).not.toContain('Strengths and an observation');
  });
  it('rejects forged roles, user-editable claims and cross-school objects', async () => {
    await actor(users.teacher, { user_metadata: { role: 'principal' } });
    await expect(workspace('principal')).rejects.toThrow('forbidden');
    await expect(workspace('teacher', otherSchool)).rejects.toThrow('forbidden');
    await expect(command('teacher', 'publish_class', { classId: otherClassId, name: 'Hijack', students: [{ name: 'Other', localRef: 'x' }], snapshot: { rows: 1, cols: 1, positions: [] } })).rejects.toThrow('forbidden');
    await expect(command('counselor', 'private_note', { referralId: referral, body: 'forged' })).rejects.toThrow('forbidden');
    await actor(users.principal);
    await expect(command('principal', 'grant_member', { email: 'teacher@school.test', displayName: 'Teacher', role: 'teacher', classIds: [otherClassId], expiresAt: null })).rejects.toThrow('forbidden');
    await expect(command('principal', 'publish_class', { classId: otherClassId, name: 'Hijack', students: [{ name: 'Other', localRef: 'x' }], snapshot: { rows: 1, cols: 1, positions: [] } })).rejects.toThrow('forbidden');
    await expect(command('principal', 'grant_member', { email: 'principal@school.test', displayName: 'Principal', role: 'counselor', classIds: [classId], expiresAt: null })).rejects.toThrow('forbidden');
  });
  it('denies direct writes and protects unfiltered table reads with RLS', async () => {
    await actor(users.teacher);
    expect((await db.query('select * from public.seatai_private_notes')).rows).toEqual([]);
    expect((await db.query('select * from public.seatai_students')).rows).toHaveLength(1);
    await expect(db.exec("update public.seatai_members set role='principal'")).rejects.toThrow('permission denied');
    await expect(db.exec("insert into public.seatai_private_notes(school_id,referral_id,author_id,body) values ('" + school + "','" + referral + "','" + users.teacher + "','intrusion')")).rejects.toThrow('permission denied');
    await actor(users.principal); expect((await db.query('select * from public.seatai_private_notes')).rows).toEqual([]);
    await db.exec('reset role; set role anon');
    await expect(db.query('select * from public.seatai_students')).rejects.toThrow('permission denied');
    await expect(db.query('select public.seatai_bootstrap()')).rejects.toThrow('permission denied');
  });
  it('completes a teacher-to-counselor-to-teacher follow-up without mixing notes', async () => {
    await actor(users.teacher); await command('teacher', 'outcome', { referralId: referral, body: 'Written instructions helped.' });
    await expect(command('teacher', 'set_status', { referralId: referral, status: 'resolved' })).rejects.toThrow('forbidden');
    await actor(users.counselor); expect((await workspace('counselor')).outcomes[0].body).toBe('Written instructions helped.');
    await command('counselor', 'set_status', { referralId: referral, status: 'resolved' });
    await actor(users.principal); expect((await workspace('principal')).summary.resolvedCases).toBe(1);
  });
  it('validates sharing, preserves case history and prevents removing the last principal', async () => {
    await actor(users.teacher);
    await expect(command('teacher', 'publish_class', { name: 'Bad', students: [], snapshot: { rows: 1, cols: 1, positions: [] } })).rejects.toThrow('invalid_request');
    await expect(command('teacher', 'publish_class', { name: 'Bad', students: [{ name: 'X', localRef: 'a' }], snapshot: { positions: [] } })).rejects.toThrow('invalid_request');
    await expect(command('teacher', 'publish_class', { classId, name: 'Class A', students: [{ name: 'Replacement', localRef: 'x' }], snapshot: { rows: 1, cols: 1, positions: [] } })).rejects.toThrow('invalid_request');
    await actor(users.principal);
    await command('principal', 'publish_class', { classId, name: 'Updated by principal', students: [{ name: 'Student A', localRef: 'a' }], snapshot: { rows: 2, cols: 2, positions: [{ localRef: 'a', row: 0, col: 0 }] } });
    expect((await workspace('principal')).classes.find(c => c.id === classId)?.optimization).toBeNull();
    const principal = (await workspace('principal')).members.find(m => m.role === 'principal')!;
    await expect(command('principal', 'revoke_member', { memberId: principal.id })).rejects.toThrow('invalid_request');
    await expect(command('principal', 'create_school', { name: 'Bad', displayName: 'Bad', notice: 'Missing authority acknowledgment.' }, null)).rejects.toThrow('forbidden');
  });
  it('requires MFA even for direct RPCs and refuses stale claims after factor removal', async () => {
    await actor(users.teacher, { aal: 'aal1' });
    await expect(workspace('teacher')).rejects.toThrow('forbidden');
    await actor(users.principal);
    await db.exec('reset role');
    await db.query('delete from auth.mfa_factors where user_id=$1', [users.principal]);
    await actor(users.principal); await expect(workspace('principal')).rejects.toThrow('forbidden');
    await db.exec('reset role');
    await db.query('insert into auth.mfa_factors values($1,$2,$3)', [session(users.principal), users.principal, 'verified']);
  });
  it('revokes class access and validates expiry and deleted sessions immediately', async () => {
    await actor(users.principal);
    const member = (await workspace('principal')).members.find(m => m.displayName === 'Teacher A')!;
    await command('principal', 'revoke_member', { memberId: member.id });
    await actor(users.teacher); await expect(workspace('teacher')).rejects.toThrow('forbidden');
    expect((await db.query('select * from public.seatai_students')).rows).toEqual([]);
    await db.exec('reset role');
    await db.query('insert into public.seatai_members(school_id,user_id,role,display_name,expires_at) values($1,$2,$3,$4,now()-interval \'1 minute\')', [school, users.expired, 'teacher', 'Expired']);
    await actor(users.expired); await expect(workspace('teacher')).rejects.toThrow('forbidden');
    await db.exec('reset role'); await db.query('delete from auth.sessions where user_id=$1', [users.counselor]);
    await actor(users.counselor); await expect(workspace('counselor')).rejects.toThrow('forbidden');
    expect((await db.query('select * from public.seatai_private_notes')).rows).toEqual([]);
  });
});
