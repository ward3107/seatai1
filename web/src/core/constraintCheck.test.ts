import { describe, it, expect } from 'vitest';
import { detectConstraintConflicts } from './constraintCheck';
import type { SeatingConstraints, Student } from '../types';
import type { LayoutDef } from './layouts';

function student(id: string, name = id): Student {
  return {
    id,
    name,
    gender: 'male',
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
  } as Student;
}

const emptyConstraints: SeatingConstraints = {
  separate_pairs: [],
  keep_together_pairs: [],
  front_row_ids: [],
  back_row_ids: [],
  aisle_ids: [],
  near_window_ids: [],
  peer_mentor_pairs: [],
};

const rows4x5: LayoutDef = { type: 'rows', rows: 4, cols: 5 };
const roster = ['a', 'b', 'c', 'd'].map((id) => student(id));

describe('detectConstraintConflicts', () => {
  it('reports no conflicts for an empty rule set', () => {
    expect(detectConstraintConflicts(emptyConstraints, roster, rows4x5)).toEqual([]);
  });

  it('flags a pair that is both kept together and kept apart', () => {
    const c = { ...emptyConstraints, keep_together_pairs: [['a', 'b']] as [string, string][], separate_pairs: [['b', 'a']] as [string, string][] };
    const out = detectConstraintConflicts(c, roster, rows4x5);
    expect(out.some((x) => x.messageKey === 'conflicts.together_and_apart' && x.severity === 'error')).toBe(true);
  });

  it('flags a mentor pair that is also kept apart', () => {
    const c = { ...emptyConstraints, peer_mentor_pairs: [['a', 'b']] as [string, string][], separate_pairs: [['a', 'b']] as [string, string][] };
    const out = detectConstraintConflicts(c, roster, rows4x5);
    expect(out.some((x) => x.messageKey === 'conflicts.mentor_and_apart')).toBe(true);
  });

  it('flags a student required at both front and back', () => {
    const c = { ...emptyConstraints, front_row_ids: ['a'], back_row_ids: ['a'] };
    const out = detectConstraintConflicts(c, roster, rows4x5);
    expect(out.some((x) => x.messageKey === 'conflicts.front_and_back' && x.severity === 'error')).toBe(true);
  });

  it('flags a self-paired student', () => {
    const c = { ...emptyConstraints, keep_together_pairs: [['a', 'a']] as [string, string][] };
    const out = detectConstraintConflicts(c, roster, rows4x5);
    expect(out.some((x) => x.messageKey === 'conflicts.self_pair')).toBe(true);
  });

  it('warns when more students are required at the front than there are front seats', () => {
    // 4x5 grid → 5 front seats. Require 6 at the front.
    const big = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => student(id));
    const c = { ...emptyConstraints, front_row_ids: ['a', 'b', 'c', 'd', 'e', 'f'] };
    const out = detectConstraintConflicts(c, big, rows4x5);
    const f = out.find((x) => x.messageKey === 'conflicts.front_overflow');
    expect(f?.severity).toBe('warning');
    expect(f?.params).toMatchObject({ need: 6, have: 5 });
  });

  it('warns when more students need the window than there are window seats', () => {
    // A circle has ~1 left-most (window) seat, so requiring 2 is impossible.
    const circle: LayoutDef = { type: 'circle', rows: 3, cols: 4 };
    const big = ['a', 'b', 'c'].map((id) => student(id));
    const c = { ...emptyConstraints, near_window_ids: ['a', 'b'] };
    const out = detectConstraintConflicts(c, big, circle);
    const w = out.find((x) => x.messageKey === 'conflicts.window_overflow');
    expect(w?.severity).toBe('warning');
    expect(w?.params?.need).toBe(2);
  });

  it('warns when there are more students than seats', () => {
    const tiny: LayoutDef = { type: 'rows', rows: 1, cols: 2 };
    const out = detectConstraintConflicts(emptyConstraints, roster, tiny);
    expect(out.some((x) => x.messageKey === 'conflicts.not_enough_seats')).toBe(true);
  });

  it('warns about rules that reference a student no longer on the roster', () => {
    const c = { ...emptyConstraints, front_row_ids: ['ghost'] };
    const out = detectConstraintConflicts(c, roster, rows4x5);
    expect(out.some((x) => x.messageKey === 'conflicts.stale_reference')).toBe(true);
  });
});
