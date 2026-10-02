/** Revoke cloud capabilities before removing their only local management copy.
 * Any failure preserves all local data so the teacher can retry. */
export async function closeDeviceSurveys(): Promise<void> {
  for (const key of Object.keys(localStorage).filter(key => key.startsWith('seatai-phone-survey:'))) {
    const session = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!session || typeof session.expiresAt !== 'number') throw new Error('Invalid session');
    if (session.expiresAt <= Date.now()) continue;
    if (!/^[a-f0-9]{64}$/.test(session.sessionId) || !/^[a-f0-9]{64}$/.test(session.adminToken)) throw new Error('Invalid session');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`/api/surveys?sessionId=${session.sessionId}`, {
        method:'DELETE', headers:{Authorization:`Bearer ${session.adminToken}`}, signal:controller.signal,
      });
      if (!response.ok && response.status !== 404) throw new Error('Could not revoke survey');
    } finally { clearTimeout(timeout); }
  }
}
