/**
 * Optional LLM-powered whole-class arrangement summary.
 *
 * Same trust model as aiExplain.ts: strictly opt-in, the teacher's own
 * Anthropic API key, browser → api.anthropic.com directly, no server.
 * We send aggregate facts about the arrangement (scores, counts, rule
 * outcomes) — not the per-student roster — so the prompt stays small
 * and low-PII. Student names appear only in the warnings the optimizer
 * itself produced.
 */

import type { OptimizationResult } from '../types';
import type { AiExplainConfig } from './aiExplain';

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1/messages';

export interface ClassSummaryFacts {
  studentCount: number;
  layoutType: string;
  scorePct: number;
  objectives: OptimizationResult['objective_scores'];
  constraintCounts: {
    separate_pairs: number;
    keep_together_pairs: number;
    front_row: number;
    back_row: number;
  };
  warnings: string[];
  generations: number;
  stopReason: string;
}

export async function aiSummarizeClass(
  config: AiExplainConfig,
  facts: ClassSummaryFacts,
  language: string,
): Promise<string> {
  const apiKey = config.apiKey.trim();
  if (!apiKey) throw new Error('Missing API key.');

  const systemPrompt =
    'You are an assistant helping a teacher communicate an AI-generated classroom ' +
    'seating arrangement to colleagues, parents, or school leadership. You will ' +
    'receive aggregate facts about one arrangement: balance scores, the rules that ' +
    'were applied, and any warnings. Write one short paragraph (4-6 sentences) a ' +
    'teacher could paste into an email: what the arrangement optimizes for, how ' +
    'well it scored, and any honest caveats from the warnings. Do not invent ' +
    'details that are not in the facts. Do not mention the genetic algorithm or ' +
    `other implementation details. Reply in the language with BCP-47 code "${language}".`;

  const userPrompt =
    'Facts about this seating arrangement:\n```json\n' +
    JSON.stringify(facts, null, 2) +
    '\n```';

  const response = await fetch(ANTHROPIC_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Same browser-direct trade-off as aiExplain.ts — there is no server.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const errBody = await response.json();
      // Same key-redaction defense-in-depth as aiExplain.ts.
      detail = JSON.stringify(errBody).replace(/sk-[A-Za-z0-9_-]+/g, '<redacted>');
    } catch {
      detail = response.statusText;
    }
    throw new Error(`AI request failed (${response.status}): ${detail}`);
  }

  const data: { content?: Array<{ type: string; text?: string }> } = await response.json();
  const text = data.content?.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('AI returned no text.');
  return text.trim();
}
