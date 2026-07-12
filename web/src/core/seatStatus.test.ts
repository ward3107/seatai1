import { describe, it, expect } from 'vitest';
import { getConstraintStatus } from './seatStatus';
import type { LayoutDef } from './layouts';
import type { OptimizationResult, SeatingConstraints, Student } from '../types';

// Minimal student factory — only the fields seatStatus reads matter.
function student(id: string, over: Partial<Student> = {}): Student {
  return {
    id,
    name: id,
    gender: 'other',
    academic_level: 'proficient',
    academic_score: 70,
    behavior_level: 'good',
    behavior_score: 70,
    friends_ids: [],
    incompatible_ids: [],
    special_needs: [],
    requires_front_row: false,
    requires_quiet_area: false,
    has_mobility_issues: false,
    is_bilingual: false,
    ...over,
  };
}

// Build a 1-row × N-col result placing the given ids left to right.
function rowResult(ids: (string | null)[]): { result: OptimizationResult; layout: LayoutDef } {
  const layout: LayoutDef = { type: 'rows', rows: 1, cols: ids.length };
  const seats = ids.map((id, col) => ({
    position: { row: 0, col, is_front_row: true, is_near_teacher: true },
    student_id: id ?? undefined,
    is_empty: id === null,
  }));
  const student_positions: OptimizationResult['student_positions'] = {};
  ids.forEach((id, col) => {
    if (id) student_positions[id] = { row: 0, col, is_front_row: true, is_near_teacher: true };
  });
  const result: OptimizationResult = {
    layout: { layout_type: 'rows', rows: 1, cols: ids.length, total_seats: ids.length, seats },
    student_positions,
    fitness_score: 1,
    objective_scores: { academic_balance: 0, behavioral_balance: 0, diversity: 0, special_needs: 0 },
    generations: 1,
    computation_time_ms: 1,
    warnings: [],
  };
  return { result, layout };
}

const noConstraints: SeatingConstraints = {
  separate_pairs: [],
  keep_together_pairs: [],
  front_row_ids: [],
  back_row_ids: [],
};

describe('getConstraintStatus', () => {
  it('marks every occupied seat OK when no rules are broken', () => {
    const { result, layout } = rowResult(['a', 'b', 'c']);
    const status = getConstraintStatus(result, [student('a'), student('b'), student('c')], noConstraints, layout);
    for (const key of ['0-0', '0-1', '0-2']) {
      expect(status.get(key)?.violated).toBe(false);
    }
  });

  it('flags both seats of an adjacent keep-apart pair', () => {
    const { result, layout } = rowResult(['a', 'b', 'c']);
    const constraints = { ...noConstraints, separate_pairs: [['a', 'b']] as [string, string][] };
    const status = getConstraintStatus(result, [student('a'), student('b'), student('c')], constraints, layout);
    expect(status.get('0-0')?.violated).toBe(true);
    expect(status.get('0-1')?.violated).toBe(true);
    expect(status.get('0-2')?.violated).toBe(false);
  });

  it('does not flag a keep-apart pair that is not adjacent', () => {
    // a and c sit at the two ends, b between them → not neighbours.
    const { result, layout } = rowResult(['a', 'b', 'c']);
    const constraints = { ...noConstraints, separate_pairs: [['a', 'c']] as [string, string][] };
    const status = getConstraintStatus(result, [student('a'), student('b'), student('c')], constraints, layout);
    expect(status.get('0-0')?.violated).toBe(false);
    expect(status.get('0-2')?.violated).toBe(false);
  });

  it('flags a keep-together pair that is NOT adjacent', () => {
    const { result, layout } = rowResult(['a', 'b', 'c']);
    const constraints = { ...noConstraints, keep_together_pairs: [['a', 'c']] as [string, string][] };
    const status = getConstraintStatus(result, [student('a'), student('b'), student('c')], constraints, layout);
    expect(status.get('0-0')?.violated).toBe(true);
    expect(status.get('0-2')?.violated).toBe(true);
  });

  it('flags incompatible neighbours symmetrically', () => {
    const { result, layout } = rowResult(['a', 'b']);
    const students = [student('a', { incompatible_ids: ['b'] }), student('b')];
    const status = getConstraintStatus(result, students, noConstraints, layout);
    expect(status.get('0-0')?.violated).toBe(true);
    expect(status.get('0-1')?.violated).toBe(true);
  });

  it('flags a seat whose student_id is no longer on the roster', () => {
    // 'ghost' sits in seat 0-1 but was removed from the students list.
    const { result, layout } = rowResult(['a', 'ghost']);
    const status = getConstraintStatus(result, [student('a')], noConstraints, layout);
    const ghostSeat = status.get('0-1');
    expect(ghostSeat?.violated).toBe(true);
    expect(ghostSeat?.reasons).toContainEqual({
      key: 'seatstatus.student_not_found',
      params: { id: 'ghost' },
    });
    // The valid student is unaffected.
    expect(status.get('0-0')?.violated).toBe(false);
  });

  it('flags a front-row student stuck in a back row', () => {
    // 2 rows × 1 col; front-row student placed in the back row.
    const layout: LayoutDef = { type: 'rows', rows: 2, cols: 1 };
    const seats = [
      { position: { row: 0, col: 0, is_front_row: true, is_near_teacher: true }, student_id: 'b', is_empty: false },
      { position: { row: 1, col: 0, is_front_row: false, is_near_teacher: false }, student_id: 'a', is_empty: false },
    ];
    const result: OptimizationResult = {
      layout: { layout_type: 'rows', rows: 2, cols: 1, total_seats: 2, seats },
      student_positions: {
        a: { row: 1, col: 0, is_front_row: false, is_near_teacher: false },
        b: { row: 0, col: 0, is_front_row: true, is_near_teacher: true },
      },
      fitness_score: 1,
      objective_scores: { academic_balance: 0, behavioral_balance: 0, diversity: 0, special_needs: 0 },
      generations: 1,
      computation_time_ms: 1,
      warnings: [],
    };
    const students = [student('a', { requires_front_row: true }), student('b')];
    const status = getConstraintStatus(result, students, noConstraints, layout);
    expect(status.get('1-0')?.violated).toBe(true);
    expect(status.get('0-0')?.violated).toBe(false);
  });

  it('flags a near-window student seated in the interior, not one at the window', () => {
    // 1×5 row: x = 0, .25, .5, .75, 1. Window band (≤ 0.06) is the leftmost seat.
    const { result, layout } = rowResult(['a', 'b', 'c', 'd', 'e']);
    const roster = ['a', 'b', 'c', 'd', 'e'].map((id) => student(id));
    const interior = getConstraintStatus(result, roster, { ...noConstraints, near_window_ids: ['c'] }, layout);
    expect(interior.get('0-2')?.violated).toBe(true);
    expect(interior.get('0-2')?.reasons).toContainEqual({ key: 'seatstatus.window_violated', params: { name: 'c' } });
    const atWindow = getConstraintStatus(result, roster, { ...noConstraints, near_window_ids: ['a'] }, layout);
    expect(atWindow.get('0-0')?.violated).toBe(false);
  });

  it('flags an aisle student in the interior, not one at either end', () => {
    const { result, layout } = rowResult(['a', 'b', 'c', 'd', 'e']);
    const roster = ['a', 'b', 'c', 'd', 'e'].map((id) => student(id));
    const interior = getConstraintStatus(result, roster, { ...noConstraints, aisle_ids: ['c'] }, layout);
    expect(interior.get('0-2')?.violated).toBe(true);
    expect(interior.get('0-2')?.reasons).toContainEqual({ key: 'seatstatus.aisle_violated', params: { name: 'c' } });
    // Both ends count as the aisle.
    const atEnds = getConstraintStatus(result, roster, { ...noConstraints, aisle_ids: ['a', 'e'] }, layout);
    expect(atEnds.get('0-0')?.violated).toBe(false);
    expect(atEnds.get('0-4')?.violated).toBe(false);
  });
});
