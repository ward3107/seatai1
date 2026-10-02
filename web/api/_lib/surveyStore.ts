import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
export const SURVEY_TTL = 7 * 24 * 60 * 60;
export interface SurveyNotice { schoolName: string; privacyEmail: string; processors: string }
export function surveyNotice(): SurveyNotice | null {
  const schoolName = process.env.SURVEY_SCHOOL_NAME?.trim() ?? '';
  const privacyEmail = process.env.SURVEY_PRIVACY_EMAIL?.trim() ?? '';
  const processors = process.env.SURVEY_PROCESSOR_NOTICE?.trim() ?? '';
  if (!schoolName || schoolName.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privacyEmail) || privacyEmail.length > 254 || !processors || processors.length > 1200) return null;
  return { schoolName, privacyEmail, processors };
}
export function surveyConfigured() {
  return !!((process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
    (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN) &&
    (process.env.SURVEY_SCHOOL_KEY?.length ?? 0) >= 32 && surveyNotice());
}
export function token() { return randomBytes(32).toString('hex'); }
export function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
export function sameSecret(a: string, b: string) { return timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b))); }
export async function command(args: (string | number)[]): Promise<unknown> {
  if (!surveyConfigured()) throw new Error('Unavailable');
  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)!;
  const credential = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)!;
  const response = await fetch(url.replace(/\/$/, ''), { method: 'POST', headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args), signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('Unavailable');
  const data = await response.json() as { result: unknown; error?: string };
  if (data.error) throw new Error('Unavailable');
  return data.result;
}
export async function get<T>(key: string): Promise<T | null> {
  const value = await command(['GET', key]);
  return typeof value === 'string' ? JSON.parse(value) as T : null;
}
export async function put(key: string, value: unknown, ttl = SURVEY_TTL) {
  await command(['SET', key, JSON.stringify(value), 'EX', ttl]);
}
export interface SurveySession { adminHash: string; expiresAt: number; invitations: { studentId: string; inviteHash: string }[] }
export interface SurveyInvite { studentId: string; language: string; expiresAt: number; notice: SurveyNotice; noticeVersion?: string; acknowledgedAt?: number; answers?: import('../../src/features/questionnaire/surveyMapping').SurveyAnswers }
export function bearer(headers: Record<string, string | string[] | undefined>) {
  const value = headers.authorization;
  return typeof value === 'string' && value.startsWith('Bearer ') ? value.slice(7) : '';
}
