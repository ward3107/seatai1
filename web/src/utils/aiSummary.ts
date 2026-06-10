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
import { anthropicMessage } from './anthropicClient';

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
  onChunk?: (text: string) => void,
): Promise<string> {
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

  return anthropicMessage({
    apiKey: config.apiKey,
    model: config.model,
    system: systemPrompt,
    prompt: userPrompt,
    maxTokens: 500,
    onChunk,
  });
}
