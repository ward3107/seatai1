import { afterEach, expect, it, vi } from 'vitest';
import { closeDeviceSurveys } from './closeDeviceSurveys';
afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); });
it('preserves management capabilities when cloud revocation fails', async () => {
  const value = JSON.stringify({ sessionId:'a'.repeat(64), adminToken:'b'.repeat(64), expiresAt:Date.now()+60000 });
  localStorage.setItem('seatai-phone-survey:class', value);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:false,status:503}));
  await expect(closeDeviceSurveys()).rejects.toThrow('Could not revoke survey');
  expect(localStorage.getItem('seatai-phone-survey:class')).toBe(value);
});
it('accepts already removed sessions and skips expired sessions', async () => {
  localStorage.setItem('seatai-phone-survey:expired', JSON.stringify({expiresAt:1}));
  localStorage.setItem('seatai-phone-survey:active', JSON.stringify({sessionId:'a'.repeat(64),adminToken:'b'.repeat(64),expiresAt:Date.now()+60000}));
  const fetcher = vi.fn().mockResolvedValue({ok:false,status:404});
  vi.stubGlobal('fetch', fetcher);
  await expect(closeDeviceSurveys()).resolves.toBeUndefined();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
