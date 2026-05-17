import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { aiExplainPlacement, type AiExplainConfig } from './aiExplain';
import type { Student } from '../types';
import type { PlacementExplanation } from './explainPlacement';

const student: Student = {
  id: '1',
  name: 'Alice',
  gender: 'female',
  academic_level: 'advanced',
  academic_score: 90,
  behavior_level: 'excellent',
  behavior_score: 95,
  friends_ids: [],
  incompatible_ids: [],
  special_needs: [],
  requires_front_row: false,
  requires_quiet_area: false,
  has_mobility_issues: false,
  is_bilingual: false,
};

const explanation: PlacementExplanation = {
  student,
  slot: { row: 0, col: 0, isFront: true, isBack: false, isLeftEdge: true, isRightEdge: false },
  reasons: [],
  strengths: [],
  weaknesses: [],
  neighbors: [],
  confidence: 'high',
};

const goodConfig: AiExplainConfig = { apiKey: 'sk-ant-test-key-xyz', model: 'claude-sonnet-4-6' };

describe('aiExplainPlacement', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('throws "Missing API key." when apiKey is empty (no network call)', async () => {
    await expect(
      aiExplainPlacement({ apiKey: '', model: 'claude' }, student, explanation),
    ).rejects.toThrow('Missing API key.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('treats whitespace-only API keys as missing (no network call)', async () => {
    await expect(
      aiExplainPlacement({ apiKey: '   \n\t  ', model: 'claude' }, student, explanation),
    ).rejects.toThrow('Missing API key.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('trims whitespace around the API key before sending', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ type: 'text', text: 'ok' }] }),
    });
    await aiExplainPlacement(
      { apiKey: '  sk-ant-trimmed-key  ', model: 'claude' },
      student,
      explanation,
    );
    const [, init] = fetchSpy.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      'x-api-key': 'sk-ant-trimmed-key',
    });
  });

  it('returns trimmed text on success', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: '   Alice sits up front to support her focus.   ' }],
      }),
    });
    const text = await aiExplainPlacement(goodConfig, student, explanation);
    expect(text).toBe('Alice sits up front to support her focus.');
  });

  it('redacts sk-... patterns from error bodies before throwing', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({
        error: { type: 'authentication_error', message: 'Invalid key sk-ant-secretLEAKED1234' },
      }),
    });
    await expect(
      aiExplainPlacement(goodConfig, student, explanation),
    ).rejects.toThrow(/<redacted>/);
    // Defense-in-depth: the leaked key must NOT appear anywhere in the
    // thrown message.
    try {
      await aiExplainPlacement(goodConfig, student, explanation);
    } catch (e) {
      expect((e as Error).message).not.toContain('sk-ant-secretLEAKED1234');
    }
  });

  it('falls back to statusText when error body is not JSON', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('not json')),
    });
    await expect(
      aiExplainPlacement(goodConfig, student, explanation),
    ).rejects.toThrow(/Internal Server Error/);
  });

  it('throws "AI returned no text." when the response contains no text block', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ type: 'tool_use' }] }),
    });
    await expect(
      aiExplainPlacement(goodConfig, student, explanation),
    ).rejects.toThrow('AI returned no text.');
  });

  it('sends the API key in x-api-key header to api.anthropic.com', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ type: 'text', text: 'ok' }] }),
    });
    await aiExplainPlacement(goodConfig, student, explanation);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect((init as RequestInit).headers).toMatchObject({
      'x-api-key': 'sk-ant-test-key-xyz',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    });
  });

  it('does not include the API key in the request body', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ type: 'text', text: 'ok' }] }),
    });
    await aiExplainPlacement(goodConfig, student, explanation);
    const [, init] = fetchSpy.mock.calls[0];
    expect((init as RequestInit).body as string).not.toContain('sk-ant-test-key-xyz');
  });

  it('propagates network errors verbatim', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      aiExplainPlacement(goodConfig, student, explanation),
    ).rejects.toThrow('Failed to fetch');
  });
});
