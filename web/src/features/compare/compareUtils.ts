import type { ObjectiveScores, OptimizationResult } from '../../types';
import { getDisplayScorePct } from '../../utils/seatingUtils';

export type ObjectiveKey = keyof ObjectiveScores;

export const OBJECTIVE_KEYS: ObjectiveKey[] = [
  'academic_balance',
  'behavioral_balance',
  'diversity',
  'special_needs',
];

export interface ObjectiveDelta {
  key: ObjectiveKey;
  a: number;
  b: number;
  /** b - a, rounded to whole points. Positive means B improved. */
  delta: number;
}

export interface ResultComparison {
  overallA: number;
  overallB: number;
  /** overallB - overallA, rounded to 1 decimal. */
  overallDelta: number;
  objectives: ObjectiveDelta[];
}

/**
 * Compare two optimization results (A = current, B = alternative) on the
 * headline score and each of the four objectives. Pure — no rounding
 * surprises: objective scores are already 0..100 integers, the overall is
 * the same 1-decimal average the rest of the UI shows.
 */
export function compareResults(
  a: OptimizationResult,
  b: OptimizationResult,
): ResultComparison {
  const overallA = getDisplayScorePct(a);
  const overallB = getDisplayScorePct(b);
  return {
    overallA,
    overallB,
    overallDelta: Math.round((overallB - overallA) * 10) / 10,
    objectives: OBJECTIVE_KEYS.map((key) => {
      const av = Math.round(a.objective_scores[key]);
      const bv = Math.round(b.objective_scores[key]);
      return { key, a: av, b: bv, delta: bv - av };
    }),
  };
}
