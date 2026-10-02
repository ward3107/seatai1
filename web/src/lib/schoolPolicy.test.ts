import { afterEach, expect, it, vi } from 'vitest';
import { anthropicMessage } from '../utils/anthropicClient';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('blocks pupil data at the network boundary even with a valid-looking key', async () => {
  vi.stubEnv('VITE_ALLOW_EXTERNAL_AI', '');
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await expect(anthropicMessage({apiKey:'sk-ant-example',model:'example',system:'example',prompt:'private pupil notes',maxTokens:10})).rejects.toThrow('disabled');
  expect(fetch).not.toHaveBeenCalled();
});
