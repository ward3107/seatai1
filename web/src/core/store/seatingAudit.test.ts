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
    resultHistory: [], changesSinceBackup: 0, selectedStudentId: null,
    detailsTargetStudentId: null,
    questionnaire: { consentAck: false, surveyedIds: [], skipPeers: false,
      peerSurveyEnabled: true, simpleMode: false, lessonStyle: null } });
});

describe('result lifecycle after input changes', () => {
  it('clears a structurally incomplete chart when a student is added', () => {
    useStore.setState({ lockedSeats: ['0-0'], history: [structuredClone(useStore.getState().result!)] });

    useStore.getState().addStudent({ ...students[0], id: 'c', name: 'c' });

    expect(useStore.getState().result).toBeNull();
    expect(useStore.getState().lockedSeats).toEqual([]);
    expect(useStore.getState().history).toEqual([]);
  });

  it('removes every dangling reference when a student is deleted', () => {
    useStore.setState({
      students: [
        { ...students[0], friends_ids: ['b'], incompatible_ids: ['b'] },
        students[1],
      ],
      constraints: {
        separate_pairs: [['a', 'b']], keep_together_pairs: [['a', 'b']],
        front_row_ids: ['a', 'b'], back_row_ids: ['b'], aisle_ids: ['b'],
        near_window_ids: ['b'], peer_mentor_pairs: [['a', 'b']],
      },
      selectedStudentId: 'b',
      detailsTargetStudentId: 'b',
      questionnaire: { ...useStore.getState().questionnaire, surveyedIds: ['a', 'b'] },
      resultHistory: [{ timestamp: '2026-01-01T00:00:00.000Z', positions: {
        a: { row: 0, col: 0 }, b: { row: 1, col: 0 },
      } }],
    });

    useStore.getState().removeStudent('b');

    const state = useStore.getState();
    expect(state.result).toBeNull();
    expect(state.students[0].friends_ids).toEqual([]);
    expect(state.students[0].incompatible_ids).toEqual([]);
    expect(state.constraints).toMatchObject({
      separate_pairs: [], keep_together_pairs: [], front_row_ids: ['a'],
      back_row_ids: [], aisle_ids: [], near_window_ids: [], peer_mentor_pairs: [],
    });
    expect(state.questionnaire.surveyedIds).toEqual(['a']);
    expect(state.resultHistory[0].positions).toEqual({ a: { row: 0, col: 0 } });
    expect(state.selectedStudentId).toBeNull();
    expect(state.detailsTargetStudentId).toBeNull();
  });

  it('preserves identity and re-scores optimizer-relevant student edits', () => {
    const before = useStore.getState().result!;

    useStore.getState().updateStudent('b', { id: 'changed', requires_front_row: true });

    const state = useStore.getState();
    expect(state.students[1].id).toBe('b');
    expect(state.result?.student_positions).toEqual(before.student_positions);
    expect(state.result?.objective_scores.special_needs).toBe(0);
    expect(state.result?.provenance?.operation).toBe('rescored');
    expect(state.result?.provenance?.inputHash).not.toBe(before.provenance?.inputHash);
    expect(state.history).toEqual([]);
  });

  it('re-scores hard-rule violations immediately after constraints change', () => {
    useStore.getState().setConstraints({
      separate_pairs: [['a', 'b']], keep_together_pairs: [],
      front_row_ids: [], back_row_ids: [], hard: { separate_pairs: true },
    });

    expect(useStore.getState().result?.unmet_hard_rules).toBe(1);
  });
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
