import { describe, expect, it } from 'vitest';
import { suggestSeatingSwap } from './suggestSeatingSwap';
import { createEmptyStudent } from '../utils/sampleData';
import type { OptimizationResult, SeatingConstraints } from '../types';

const students = ['a', 'b', 'c'].map((id) => ({ ...createEmptyStudent(), id, name: id }));
const layout = { type: 'rows' as const, rows: 1, cols: 3 };
const constraints: SeatingConstraints = { separate_pairs: [['a', 'b']], keep_together_pairs: [], front_row_ids: [], back_row_ids: [], hard: { separate_pairs: true } };
function chart(): OptimizationResult {
  return { layout: { layout_type: 'rows', rows: 1, cols: 3, total_seats: 3,
    seats: students.map((student, col) => ({ student_id: student.id, is_empty: false, position: { row: 0, col, is_front_row: true, is_near_teacher: true } })) },
    student_positions: {}, fitness_score: 1, objective_scores: { academic_balance: 100, behavioral_balance: 100, diversity: 100, special_needs: 100 },
    generations: 1, computation_time_ms: 1, warnings: [] };
}

describe('suggestSeatingSwap', () => {
  it('suggests a two-seat improvement without mutating the chart', () => {
    const result = chart();
    const snapshot = structuredClone(result);
    const suggestion = suggestSeatingSwap(result, students, constraints, layout, []);
    expect(suggestion).toMatchObject({ before: 2, after: 0 });
    expect(result).toEqual(snapshot);
  });
  it('leaves locked seats untouched', () => {
    const suggestion = suggestSeatingSwap(chart(), students, constraints, layout, ['0-0']);
    expect(suggestion).not.toBeNull();
    expect([suggestion!.seatA, suggestion!.seatB]).not.toContain('0-0');
    expect(suggestSeatingSwap(chart(), students, constraints, layout, ['0-0', '0-1', '0-2'])).toBeNull();
  });
  it('does not solve a preference by breaking a previously met required rule', () => {
    expect(suggestSeatingSwap(chart(), students, {
      ...constraints, keep_together_pairs: [['a', 'b']], hard: { keep_together_pairs: true },
    }, layout, [])).toBeNull();
  });
  it('does not suggest changes for incomplete charts', () => {
    expect(suggestSeatingSwap(chart(), [...students, { ...createEmptyStudent(), id: 'missing' }], constraints, layout, [])).toBeNull();
  });
});
