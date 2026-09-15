import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRotationPlanner } from '../../hooks/useRotationPlanner';
import { useStore } from './index';
import { ClassroomOptimizer } from '../optimizer';
import type { Student } from '../../types';

const students: Student[] = ['a', 'b'].map(id => ({
  id, name: id, gender: 'other', academic_level: 'proficient', academic_score: 75,
  behavior_level: 'good', behavior_score: 80, friends_ids: [], incompatible_ids: [],
  special_needs: [], requires_front_row: false, requires_quiet_area: false,
  has_mobility_issues: false, is_bilingual: false,
}));
const layoutDef = { type: 'rows' as const, rows: 2, cols: 1 };
const constraints = { separate_pairs: [], keep_together_pairs: [], front_row_ids: ['a'], back_row_ids: [], hard: { front_row_ids: true } };
beforeEach(() => {
  const optimizer = new ClassroomOptimizer(students, layoutDef);
  optimizer.setConstraints(constraints);
  optimizer.setPinned(new Map([[0, 'a'], [1, 'b']]));
  const result = optimizer.optimize();
  useStore.setState({ students, layoutDef, rows: 2, cols: 1, constraints, result,
    history: [], historyFuture: [], lockedSeats: [], avoidRecentNeighbors: false,
    resultHistory: [], changesSinceBackup: 0 });
});
describe('manual seating edits', () => {
  it('updates required-rule violations and score, with undo and redo', () => {
    const initial = structuredClone(useStore.getState().result!);
    expect(initial.unmet_hard_rules ?? 0).toBe(0);
    useStore.getState().swapStudents('0-0', '1-0');
    const changed = useStore.getState().result!;
    expect(changed.unmet_hard_rules).toBe(1);
    expect(changed.fitness_score).toBeLessThan(initial.fitness_score - 900);
    expect(changed.student_positions.a.row).toBe(1);
    expect(useStore.getState().changesSinceBackup).toBe(1);
    useStore.getState().undo();
    expect(useStore.getState().result).toEqual(initial);
    useStore.getState().redo();
    expect(useStore.getState().result?.unmet_hard_rules).toBe(1);
  });
  it('protects locks at the store boundary', () => {
    useStore.setState({ lockedSeats: ['0-0'] });
    const initial = useStore.getState().result;
    useStore.getState().swapStudents('0-0', '1-0');
    expect(useStore.getState().result).toEqual(initial);
    expect(useStore.getState().history).toHaveLength(0);
  });
  it('ignores invalid destinations without polluting undo history', () => {
    useStore.getState().swapStudents('0-0', '99-99');
    expect(useStore.getState().history).toHaveLength(0);
    expect(useStore.getState().changesSinceBackup).toBe(0);
  });
});

describe('isolated student placement', () => {
  it('still rewards a front-row need when every neighboring seat is empty', () => {
    const optimizer = new ClassroomOptimizer([{ ...students[0], requires_front_row: true }], layoutDef);
    const seat = (row: number) => [{ position: { row, col: 0, is_front_row: row === 0, is_near_teacher: row === 0 }, student_id: 'a', is_empty: false }];
    const front = optimizer.evaluateSeating(seat(0));
    const back = optimizer.evaluateSeating(seat(1));
    expect(front.fitness_score).toBeGreaterThan(back.fitness_score);
    expect(front.objective_scores.special_needs).toBe(100);
    expect(back.objective_scores.special_needs).toBe(0);
  });
});

describe('seating integrity across room shapes', () => {
  for (const type of ['rows', 'clusters', 'u-shape', 'circle', 'custom-rows'] as const) {
    it.each([1, 17, 42])(`${type}: preserves every identity and the locked student (seed %i)`, seed => {
      const roster = Array.from({ length: 8 }, (_, i) => ({ ...students[0], id: `s${i}` }));
      const optimizer = new ClassroomOptimizer(roster, { type, rows: 4, cols: 4, customRowSizes: [4, 4, 4, 4] });
      optimizer.setConfig({ populationSize: 20, maxGenerations: 15, crossoverRate: 0.8, mutationRate: 0.2, tournamentSize: 3, earlyStopPatience: 5, seed });
      optimizer.setPinned(new Map([[0, 's0']]));
      const result = optimizer.optimize();
      const occupied = result.layout.seats.filter(s => s.student_id);
      expect(occupied.map(s => s.student_id).sort()).toEqual(roster.map(s => s.id).sort());
      expect(new Set(occupied.map(s => `${s.position.row}-${s.position.col}`)).size).toBe(roster.length);
      expect(result.layout.seats[0].student_id).toBe('s0');
      expect(Number.isFinite(result.fitness_score)).toBe(true);
    });
  }
});

it('preserves locked students throughout a generated rotation plan', async () => {
  useStore.setState({ lockedSeats: ['0-0', '1-0'] });
  const { result, unmount } = renderHook(() => useRotationPlanner());
  await act(async () => {
    const plan = await result.current.generatePlan(2, 'Period');
    expect(plan?.periods).toHaveLength(2);
    for (const period of plan!.periods) {
      expect(period.result.student_positions.a.row).toBe(0);
      expect(period.result.student_positions.b.row).toBe(1);
    }
  });
  unmount();
});
