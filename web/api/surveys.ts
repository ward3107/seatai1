import type { ApiRequest, ApiResponse } from './_lib/httpTypes';
import { rateLimit } from './_lib/rateLimit';
import { bearer, command, get, hash, put, sameSecret, surveyConfigured, surveyNotice, token, SURVEY_TTL, type SurveySession, type SurveyInvite } from './_lib/surveyStore';
export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (!['GET', 'POST', 'DELETE'].includes(req.method ?? '')) { res.setHeader('Allow','GET, POST, DELETE'); res.status(405).json({ error:'method_not_allowed' }); return; }
  if (req.method === 'GET' && !req.query.sessionId) { res.status(200).json({ available: surveyConfigured() }); return; }
  if (!surveyConfigured()) { res.status(503).json({ error:'unavailable' }); return; }
  try {
    if (!(await rateLimit(req, res, { prefix: 'survey', maximum: 300 }))) return;
    const authorization = bearer(req.headers);
    if (req.method === 'POST') {
      if (!sameSecret(authorization, process.env.SURVEY_SCHOOL_KEY!)) { res.status(401).json({ error:'unauthorized' }); return; }
      const ids = req.body?.studentIds;
      const language = req.body?.language;
      if (!Array.isArray(ids) || ids.length < 1 || ids.length > 50 || ids.some(id => typeof id !== 'string' || !id || id.length > 128) || new Set(ids).size !== ids.length || !['he','en','ar','ru'].includes(language as string)) { res.status(400).json({ error:'invalid_request' }); return; }
      const sessionId = token(); const adminToken = token(); const expiresAt = Date.now() + SURVEY_TTL * 1000;
      const invitations = ids.map(studentId => ({ studentId: studentId as string, token: token() }));
      // Session is written last; partially failed creation exposes no capabilities.
      for (let offset = 0; offset < invitations.length; offset += 5) {
        await Promise.all(invitations.slice(offset, offset + 5).map(invite =>
          put(`survey:invite:${hash(invite.token)}`, { studentId: invite.studentId, language, expiresAt, notice: surveyNotice() })));
      }
      await put(`survey:session:${sessionId}`, { adminHash: hash(adminToken), expiresAt, invitations: invitations.map(invite => ({ studentId:invite.studentId, inviteHash:hash(invite.token) })) });
      res.status(201).json({ sessionId, adminToken, expiresAt, invitations }); return;
    }
    const sessionId = req.query.sessionId;
    if (typeof sessionId !== 'string' || !/^[a-f0-9]{64}$/.test(sessionId)) { res.status(404).json({ error:'not_found' }); return; }
    const key = `survey:session:${sessionId}`;
    const session = await get<SurveySession>(key);
    if (!session || session.expiresAt <= Date.now() || !sameSecret(session.adminHash, hash(authorization))) { res.status(404).json({ error:'not_found' }); return; }
    if (req.method === 'DELETE') {
      await command(['DEL', key, ...session.invitations.map(invite => `survey:invite:${invite.inviteHash}`)]);
      res.status(200).json({ closed:true }); return;
    }
    const responses = [];
    const records = await command(['MGET', ...session.invitations.map(invite => `survey:invite:${invite.inviteHash}`)]);
    if (!Array.isArray(records) || records.length !== session.invitations.length) throw new Error('Unavailable');
    for (const [index, invite] of session.invitations.entries()) {
      const record = typeof records[index] === 'string' ? JSON.parse(records[index]) as SurveyInvite : null;
      if (record?.answers) responses.push({ studentId:invite.studentId, answers:record.answers });
    }
    res.status(200).json({ expiresAt:session.expiresAt, responses });
  } catch { res.status(503).json({ error:'unavailable' }); }
}
