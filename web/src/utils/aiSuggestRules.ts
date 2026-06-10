/**
 * AI-suggested seating rules from teacher notes.
 *
 * The teacher already writes free-text notes per student ("argues with
 * Dana", "needs to sit close to the board"). This sends ONLY the students
 * who have notes (id, name, notes) to the model and asks for structured
 * rule suggestions. Nothing is applied automatically — the UI shows each
 * suggestion as a chip the teacher explicitly accepts or dismisses.
 *
 * Same trust model as the other AI features: opt-in, the teacher's own
 * key, browser → Anthropic directly.
 */

import type { Student, SeatingConstraints } from '../types';
import type { AiExplainConfig } from './aiExplain';
import { anthropicMessage } from './anthropicClient';

export type SuggestionKind = 'separate' | 'keep_together' | 'front_row';

export interface RuleSuggestion {
  kind: SuggestionKind;
  /** Student id (always present). */
  a: string;
  /** Second student id — only for the pair kinds. */
  b?: string;
  /** The model's one-line justification, quoted from / grounded in the notes. */
  reason: string;
}

const SYSTEM_PROMPT =
  'You extract classroom seating rules from a teacher\'s private notes about students. ' +
  'You receive a JSON array of students: {id, name, notes}. Suggest rules ONLY when the ' +
  'notes clearly support them — do not guess or over-suggest. Possible kinds: ' +
  '"separate" (two students should not sit together; requires "a" and "b"), ' +
  '"keep_together" (two students benefit from sitting together; requires "a" and "b"), ' +
  '"front_row" (one student should sit at the front; only "a"). ' +
  'Use student ids (not names) for "a"/"b". Each suggestion needs a short "reason" in the ' +
  'same language the notes are written in, grounded in the notes. ' +
  'Reply with ONLY a JSON object, no prose, of the shape: ' +
  '{"suggestions": [{"kind": "...", "a": "...", "b": "...", "reason": "..."}]} ' +
  'If the notes support no rules, reply {"suggestions": []}.';

/** Extract the first JSON object from a model reply that may be wrapped in
 *  code fences or stray prose. */
function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('AI returned no JSON.');
  return JSON.parse(text.slice(start, end + 1));
}

/** Validate + sanitize the model output against the actual roster. Drops
 *  anything malformed, unknown ids, self-pairs, and duplicates. */
export function sanitizeSuggestions(
  raw: unknown,
  students: Student[],
  existing: SeatingConstraints,
): RuleSuggestion[] {
  const ids = new Set(students.map((s) => s.id));
  const out: RuleSuggestion[] = [];
  const seen = new Set<string>();

  const pairKey = (a: string, b: string) => [a, b].sort().join('|');
  const hasPair = (list: [string, string][] | undefined, a: string, b: string) =>
    (list ?? []).some(([x, y]) => pairKey(x, y) === pairKey(a, b));

  const list = (raw as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(list)) return out;

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Partial<RuleSuggestion>;
    if (s.kind !== 'separate' && s.kind !== 'keep_together' && s.kind !== 'front_row') continue;
    if (typeof s.a !== 'string' || !ids.has(s.a)) continue;
    const reason = typeof s.reason === 'string' ? s.reason.slice(0, 300) : '';

    if (s.kind === 'front_row') {
      if (existing.front_row_ids.includes(s.a)) continue;
      const key = `front|${s.a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind: 'front_row', a: s.a, reason });
      continue;
    }

    // Pair kinds.
    if (typeof s.b !== 'string' || !ids.has(s.b) || s.b === s.a) continue;
    const field = s.kind === 'separate' ? existing.separate_pairs : existing.keep_together_pairs;
    if (hasPair(field, s.a, s.b)) continue;
    const key = `${s.kind}|${pairKey(s.a, s.b)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: s.kind, a: s.a, b: s.b, reason });
  }

  // Keep the review list manageable.
  return out.slice(0, 12);
}

export async function aiSuggestRules(
  config: AiExplainConfig,
  students: Student[],
  existing: SeatingConstraints,
): Promise<RuleSuggestion[]> {
  const withNotes = students
    .filter((s) => s.notes && s.notes.trim().length > 0)
    .map((s) => ({ id: s.id, name: s.name, notes: s.notes }));

  if (withNotes.length === 0) return [];

  const text = await anthropicMessage({
    apiKey: config.apiKey,
    model: config.model,
    system: SYSTEM_PROMPT,
    prompt: 'Students with notes:\n```json\n' + JSON.stringify(withNotes, null, 2) + '\n```',
    maxTokens: 1000,
  });

  return sanitizeSuggestions(extractJson(text), students, existing);
}
