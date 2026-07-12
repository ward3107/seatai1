import { describe, it, expect } from 'vitest';
import { getViolations } from './seatingUtils';
import { generateSlots } from '../core/layouts';
import type { LayoutType, Slot } from '../core/layouts';
import type { OptimizationResult, Student } from '../types';

// Minimal student factory — only the fields getViolations reads matter.
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

/**
 * Build an OptimizationResult from real layout slots, mirroring how the
 * optimizer's `buildLayout` populates `rows`/`cols` (max logical value + 1,
 * NOT the LayoutDef's rows/cols).
 */
function resultFromSlots(
  layoutType: LayoutType,
  slots: Slot[],
  assign: Record<number, string>, // slot index → student id
): OptimizationResult {
  const seats = slots.map((slot) => ({
    position: {
      row: slot.row,
      col: slot.col,
      is_front_row: slot.isFront,
      is_near_teacher: slot.isFront,
      x: slot.x,
      y: slot.y,
    },
    student_id: assign[slot.index],
    is_empty: assign[slot.index] === undefined,
  }));
  const student_positions: OptimizationResult['student_positions'] = {};
  for (const seat of seats) {
    if (seat.student_id) student_positions[seat.student_id] = seat.position;
  }
  const maxRow = slots.reduce((m, s) => Math.max(m, s.row), 0);
  const maxCol = slots.reduce((m, s) => Math.max(m, s.col), 0);
  return {
    layout: {
      layout_type: layoutType,
      rows: maxRow + 1,
      cols: maxCol + 1,
      total_seats: slots.length,
      seats,
    },
    student_positions,
    fitness_score: 1,
    objective_scores: { academic_balance: 0, behavioral_balance: 0, diversity: 0, special_needs: 0 },
    generations: 1,
    computation_time_ms: 1,
    warnings: [],
  };
}

describe('getViolations', () => {
  it('flags both seats of an incompatible pair sitting side by side in a rows grid', () => {
    const slots = generateSlots({ type: 'rows', rows: 1, cols: 3 });
    const result = resultFromSlots('rows', slots, { 0: 'a', 1: 'b', 2: 'c' });
    const students = [student('a', { incompatible_ids: ['b'] }), student('b'), student('c')];
    const violations = getViolations(result, students);
    expect(violations.has('0-0')).toBe(true);
    expect(violations.has('0-1')).toBe(true);
    expect(violations.has('0-2')).toBe(false);
  });

  it('does not flag a non-adjacent incompatible pair (neighbour probes past the grid edge find nothing)', () => {
    // a sits at the left edge, c at the right edge of a 1×3 row — their
    // neighbour probes go out of bounds (col -1 / col 3) and must resolve
    // to "no seat", not a crash or a phantom match.
    const slots = generateSlots({ type: 'rows', rows: 1, cols: 3 });
    const result = resultFromSlots('rows', slots, { 0: 'a', 1: 'b', 2: 'c' });
    const students = [student('a', { incompatible_ids: ['c'] }), student('b'), student('c')];
    const violations = getViolations(result, students);
    expect(violations.size).toBe(0);
  });

  it('flags a front-row / mobility student seated beyond row 0', () => {
    const slots = generateSlots({ type: 'rows', rows: 2, cols: 1 });
    const result = resultFromSlots('rows', slots, { 0: 'b', 1: 'a' });
    const students = [student('a', { requires_front_row: true }), student('b')];
    const violations = getViolations(result, students);
    expect(violations.has('1-0')).toBe(true);
    expect(violations.has('0-0')).toBe(false);
  });

  it('uses slot.isFront (not row 0) for the front-row rule on a large circle', () => {
    // On an 8-row circle the front seats sit at row ≥ 1 (the ring never reaches
    // the pole), so the old `row > 0` check false-flagged a correctly-front
    // student while its own badge showed green. With the layoutDef supplied,
    // getViolations must agree with slot.isFront.
    const layoutDef = { type: 'circle', rows: 8, cols: 2 } as const;
    const slots = generateSlots(layoutDef);
    const frontSlot = slots.find((s) => s.isFront)!;
    const backSlot = slots.find((s) => s.isBack)!;
    expect(frontSlot.row).toBeGreaterThan(0); // regression precondition
    const result = resultFromSlots('circle', slots, {
      [frontSlot.index]: 'a',
      [backSlot.index]: 'b',
    });
    const students = [
      student('a', { requires_front_row: true }),
      student('b', { requires_front_row: true }),
    ];
    const violations = getViolations(result, students, layoutDef);
    // 'a' is correctly at the front → not flagged; 'b' at the back → flagged.
    expect(violations.has(`${frontSlot.row}-${frontSlot.col}`)).toBe(false);
    expect(violations.has(`${backSlot.row}-${backSlot.col}`)).toBe(true);
  });

  it('flags ring-adjacent incompatible students in a circle layout (wrap-around pair)', () => {
    // 6-seat circle. Ring indices 0 and 5 are physically adjacent (the ring
    // wraps), but their logical (row, col) coordinates are NOT grid-adjacent
    // — the old grid-probe implementation silently missed this violation.
    const slots = generateSlots({ type: 'circle', rows: 3, cols: 2 });
    expect(slots).toHaveLength(6);
    const first = slots[0];
    const last = slots[slots.length - 1];
    // Precondition for the regression: the pair is not grid-adjacent.
    expect(Math.abs(first.row - last.row) + Math.abs(first.col - last.col)).toBeGreaterThan(1);

    const result = resultFromSlots('circle', slots, { 0: 'a', 5: 'b' });
    const students = [student('a', { incompatible_ids: ['b'] }), student('b')];
    const violations = getViolations(result, students);
    expect(violations.has(`${first.row}-${first.col}`)).toBe(true);
    expect(violations.has(`${last.row}-${last.col}`)).toBe(true);
  });

  it('flags ring-adjacent incompatible students whose logical rows differ (circle, non-wrap)', () => {
    const slots = generateSlots({ type: 'circle', rows: 3, cols: 2 });
    // Ring indices 0 and 1 are adjacent on the ring but sit in different
    // logical rows, so the old (row, col) ± 1 probing never matched them.
    const result = resultFromSlots('circle', slots, { 0: 'a', 1: 'b' });
    const students = [student('a', { incompatible_ids: ['b'] }), student('b')];
    const violations = getViolations(result, students);
    expect(violations.has(`${slots[0].row}-${slots[0].col}`)).toBe(true);
    expect(violations.has(`${slots[1].row}-${slots[1].col}`)).toBe(true);
  });

  it('does not flag incompatible students seated across the circle from each other', () => {
    const slots = generateSlots({ type: 'circle', rows: 3, cols: 2 });
    const result = resultFromSlots('circle', slots, { 0: 'a', 3: 'b' });
    const students = [student('a', { incompatible_ids: ['b'] }), student('b')];
    const violations = getViolations(result, students);
    expect(violations.size).toBe(0);
  });

  it('flags diagonal pod-mates in a clusters layout when given the layout def', () => {
    // In a 2×2 pod every seat is a pod-mate (neighbour) of every other,
    // including the diagonal pair — which is NOT orthogonally grid-adjacent.
    // The optimizer scores them as neighbours, so the violation highlighting
    // must agree once the layout def is supplied.
    const def = { type: 'clusters' as const, rows: 2, cols: 2, clusterSize: 2 };
    const slots = generateSlots(def);
    // Find the two diagonal seats of the first pod.
    const s00 = slots.find((s) => s.row === 0 && s.col === 0)!;
    const s11 = slots.find((s) => s.row === 1 && s.col === 1)!;
    expect(s00.neighbors).toContain(s11.index); // pod-mates
    // ...but they are not grid-orthogonal neighbours.
    expect(Math.abs(s00.row - s11.row) + Math.abs(s00.col - s11.col)).toBe(2);

    const result = resultFromSlots('clusters', slots, { [s00.index]: 'a', [s11.index]: 'b' });
    const students = [student('a', { incompatible_ids: ['b'] }), student('b')];

    // Without the layout def the grid heuristic misses it...
    expect(getViolations(result, students).size).toBe(0);
    // ...with it, both seats are correctly flagged.
    const withDef = getViolations(result, students, def);
    expect(withDef.has(`${s00.row}-${s00.col}`)).toBe(true);
    expect(withDef.has(`${s11.row}-${s11.col}`)).toBe(true);
  });
});
