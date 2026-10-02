import type { ApiRequest, ApiResponse } from './_lib/httpTypes';
import { rateLimit } from './_lib/rateLimit';
import { bearer, command, get, hash, surveyConfigured, type SurveyInvite } from './_lib/surveyStore';
import { validSurveyAnswers } from '../src/features/questionnaire/validateAnswers';
export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Referrer-Policy','no-referrer');
  if (!['GET','POST','DELETE'].includes(req.method ?? '')) { res.setHeader('Allow','GET, POST, DELETE'); res.status(405).json({ error:'method_not_allowed' }); return; }
  if (!surveyConfigured()) { res.status(503).json({ error:'unavailable' }); return; }
  try {
    if (!(await rateLimit(req,res, { prefix: 'survey', maximum: 300 }))) return;
    const inviteToken = bearer(req.headers);
    if (!/^[a-f0-9]{64}$/.test(inviteToken)) { res.status(404).json({ error:'not_found' }); return; }
    const key = `survey:invite:${hash(inviteToken)}`;
    const invite = await get<SurveyInvite>(key);
    if (!invite || invite.expiresAt <= Date.now()) { res.status(404).json({ error:'not_found' }); return; }
    if (req.method === 'DELETE') {
      await command(['DEL', key]);
      res.status(200).json({ deleted:true }); return;
    }
    if (req.method === 'GET') { res.status(200).json({ language:invite.language, submitted:!!invite.answers, expiresAt:invite.expiresAt, notice:invite.notice }); return; }
    const answers = req.body?.answers;
    if (req.body?.noticeAcknowledged !== true || !invite.notice) { res.status(400).json({ error:'notice_required' }); return; }
    if (!validSurveyAnswers(answers) || answers.seatmates.length || answers.helper !== null) { res.status(400).json({ error:'invalid_answers' }); return; }
    const ttl = Math.max(1,Math.floor((invite.expiresAt - Date.now()) / 1000));
    // XX prevents an expired or revoked invitation from being recreated by submission.
    const saved = await command(['SET',key,JSON.stringify({ ...invite, answers, noticeVersion:'2026-10-02', acknowledgedAt:Date.now() }),'XX','EX',ttl]);
    if (saved !== 'OK') { res.status(404).json({ error:'not_found' }); return; }
    res.status(200).json({ saved:true });
  } catch { res.status(503).json({ error:'unavailable' }); }
}
