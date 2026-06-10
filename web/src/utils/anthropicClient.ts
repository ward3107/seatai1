/**
 * Tiny shared client for the app's opt-in AI features.
 *
 * Same trust model everywhere (see aiExplain.ts): the teacher's own
 * Anthropic API key, browser → api.anthropic.com directly, no server.
 * This module centralises the request/error/redaction plumbing and adds
 * SSE streaming so callers can render text as it's generated.
 */

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1/messages';

export interface AnthropicRequest {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  maxTokens: number;
  /** When provided, the request streams and this is called with each text
   *  fragment as it arrives. The resolved value is always the full text. */
  onChunk?: (text: string) => void;
}

function headers(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    // Required for browser-origin requests. Anthropic recommends proxying
    // server-side for production; this app explicitly trades that off to
    // stay backend-free.
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

/** Strip anything that looks like an API key before surfacing an error —
 *  defense-in-depth in case the API ever echoes headers back. */
function redact(s: string): string {
  return s.replace(/sk-[A-Za-z0-9_-]+/g, '<redacted>');
}

async function throwApiError(response: Response): Promise<never> {
  let detail = '';
  try {
    detail = redact(JSON.stringify(await response.json()));
  } catch {
    detail = response.statusText;
  }
  throw new Error(`AI request failed (${response.status}): ${detail}`);
}

/**
 * One-shot or streaming message request. Returns the complete text either
 * way; with `onChunk` the text also arrives incrementally.
 */
export async function anthropicMessage(req: AnthropicRequest): Promise<string> {
  const apiKey = req.apiKey.trim();
  if (!apiKey) throw new Error('Missing API key.');

  const body = {
    model: req.model,
    max_tokens: req.maxTokens,
    system: req.system,
    messages: [{ role: 'user', content: req.prompt }],
    ...(req.onChunk ? { stream: true } : {}),
  };

  const response = await fetch(ANTHROPIC_API_BASE, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify(body),
  });

  if (!response.ok) await throwApiError(response);

  // Non-streaming: single JSON envelope.
  if (!req.onChunk) {
    const data: { content?: Array<{ type: string; text?: string }> } = await response.json();
    const text = data.content?.find((c) => c.type === 'text')?.text;
    if (!text) throw new Error('AI returned no text.');
    return text.trim();
  }

  // Streaming: SSE lines — accumulate text_delta fragments.
  if (!response.body) throw new Error('AI returned no stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are newline-delimited; keep the trailing partial line.
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const evt = JSON.parse(payload) as {
          type?: string;
          delta?: { type?: string; text?: string };
          error?: { message?: string };
        };
        if (evt.type === 'error') {
          throw new Error(`AI stream error: ${redact(evt.error?.message ?? 'unknown')}`);
        }
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) {
          full += evt.delta.text;
          req.onChunk(evt.delta.text);
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('AI stream error')) throw e;
        // Malformed keep-alive / unknown event — skip.
      }
    }
  }

  if (!full) throw new Error('AI returned no text.');
  return full.trim();
}
