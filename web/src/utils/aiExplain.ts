/**
 * Optional LLM-powered placement explanation.
 *
 * Strictly opt-in:
 *   - Disabled by default. No outbound request is ever made unless the
 *     teacher (a) enters their own Anthropic API key in Settings and
 *     (b) clicks "Generate AI explanation" in the student drawer.
 *   - API key is stored client-side only (in the same persisted store
 *     as the rest of the app) and never leaves the browser except in
 *     the Authorization header to api.anthropic.com.
 *   - We don't proxy through any server. There IS no server.
 *
 * The function takes the same structured `PlacementExplanation` the
 * rule engine produces and asks Claude to translate it into a single
 * teacher-friendly paragraph. We send the structured facts, not the
 * raw roster, so the prompt stays small and bounded.
 *
 * Errors are surfaced verbatim so the teacher can see what went
 * wrong (bad key, rate limit, no network) — except the API key
 * itself, which is never echoed.
 */

import type { Student } from '../types';
import type { PlacementExplanation } from './explainPlacement';

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1/messages';

export interface AiExplainConfig {
  apiKey: string;
  model: string;
}

export async function aiExplainPlacement(
  config: AiExplainConfig,
  student: Student,
  explanation: PlacementExplanation,
): Promise<string> {
  const apiKey = config.apiKey.trim();
  if (!apiKey) throw new Error('Missing API key.');

  // Compact, structured representation — no PII beyond what the
  // teacher entered locally. Names are included because explanations
  // reference them; if you're uncomfortable with that, leave the
  // feature off.
  const facts = {
    student: {
      name: student.name,
      gender: student.gender,
      academic_level: student.academic_level,
      academic_score: student.academic_score,
      behavior_level: student.behavior_level,
      behavior_score: student.behavior_score,
      special_needs: student.special_needs.map((n) => n.type),
      requires_front_row: student.requires_front_row,
      requires_quiet_area: student.requires_quiet_area,
      has_mobility_issues: student.has_mobility_issues,
      bilingual: student.is_bilingual,
      notes: student.notes,
    },
    seat: explanation.slot,
    confidence: explanation.confidence,
    reasons: explanation.reasons.map((r) => ({ key: r.key, tone: r.tone })),
    strengths: explanation.strengths.map((r) => ({ key: r.key, tone: r.tone })),
    weaknesses: explanation.weaknesses.map((r) => ({ key: r.key, tone: r.tone })),
    neighbors: explanation.neighbors.map((n) => ({
      name: n.student.name,
      relation: n.relation,
      academicDiff: n.academicDiff,
      behaviorDiff: n.behaviorDiff,
      sameGender: n.sameGender,
    })),
  };

  const systemPrompt =
    'You are an assistant helping a teacher understand an AI-generated seating chart. ' +
    'You will receive structured facts about one student and the AI\'s reasoning for ' +
    'placing them in a specific seat. Write a single short paragraph (3-5 sentences) ' +
    'that a teacher could read in 10 seconds and immediately understand the placement. ' +
    'Be warm but specific. Mention specific neighbors by name where helpful. Call out ' +
    'tradeoffs honestly. Do not invent details that aren\'t in the facts. Reply in the ' +
    'same language the student name is written in if obvious; otherwise English.';

  const userPrompt =
    'Facts about this student\'s placement:\n```json\n' +
    JSON.stringify(facts, null, 2) +
    '\n```';

  const response = await fetch(ANTHROPIC_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Required for browser-origin requests. Anthropic recommends
      // proxying server-side for production; this app explicitly trades
      // that off to stay backend-free.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const errBody = await response.json();
      // Strip anything that looks like a key from the error body before
      // surfacing — defense-in-depth in case Anthropic ever echoes
      // headers back.
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
