import { describe, it, expect } from 'vitest';
import { compareResults, OBJECTIVE_KEYS } from './compareUtils';
import type { OptimizationResult, ObjectiveScores } from '../../types';

function makeResult(scores: ObjectiveScores): OptimizationResult {
  return {
    layout: { layout_type: 'rows', rows: 1, cols: 1, total_seats: 0, seats: [] },
    student_positions: {},
    fitness_score: 0,
    objective_scores: scores,
    generations: 1,
    computation_time_ms: 1,
    warnings: [],
  };
}

describe('compareResults', () => {
  it('computes per-objective deltas (b - a)', () => {
    const a = makeResult({ academic_balance: 50, behavioral_balance: 60, diversity: 40, special_needs: 80 });
    const b = makeResult({ academic_balance: 70, behavioral_balance: 55, diversity: 40, special_needs: 90 });
    const c = compareResults(a, b);

    const byKey = Object.fromEntries(c.objectives.map((o) => [o.key, o]));
    expect(byKey.academic_balance.delta).toBe(20); // improved
    expect(byKey.behavioral_balance.delta).toBe(-5); // regressed
    expect(byKey.diversity.delta).toBe(0); // unchanged
    expect(byKey.special_needs.delta).toBe(10);
  });

  it('reports all four objectives in a stable order', () => {
    const r = makeResult({ academic_balance: 1, behavioral_balance: 1, diversity: 1, special_needs: 1 });
    const c = compareResults(r, r);
    expect(c.objectives.map((o) => o.key)).toEqual(OBJECTIVE_KEYS);
  });

  it('computes the overall delta from the displayed (averaged) score', () => {
    // A average = (40+40+40+40)/4 = 40. B average = (80+80+80+80)/4 = 80.
    const a = makeResult({ academic_balance: 40, behavioral_balance: 40, diversity: 40, special_needs: 40 });
    const b = makeResult({ academic_balance: 80, behavioral_balance: 80, diversity: 80, special_needs: 80 });
    const c = compareResults(a, b);
    expect(c.overallA).toBe(40);
    expect(c.overallB).toBe(80);
    expect(c.overallDelta).toBe(40);
  });

  it('rounds objective scores to whole points', () => {
    const a = makeResult({ academic_balance: 50.4, behavioral_balance: 0, diversity: 0, special_needs: 0 });
    const b = makeResult({ academic_balance: 50.6, behavioral_balance: 0, diversity: 0, special_needs: 0 });
    const c = compareResults(a, b);
    const academic = c.objectives.find((o) => o.key === 'academic_balance')!;
    expect(academic.a).toBe(50);
    expect(academic.b).toBe(51);
    expect(academic.delta).toBe(1);
  });
});
