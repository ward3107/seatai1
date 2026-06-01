import { describe, it, expect } from 'vitest';
import {
  surveyToStudentPatch,
  applyWindowPreference,
  applyMentorPreference,
  answersFromStudent,
  emptyAnswers,
  MAX_SEATMATES,
} from './surveyMapping';
import type { Student, SeatingConstraints } from '../../types';

const baseConstraints: SeatingConstraints = {
  separate_pairs: [],
  keep_together_pairs: [],
  front_row_ids: [],
  back_row_ids: [],
};

const makeStudent = (over: Partial<Student> = {}): Student => ({
  id: 's1',
  name: 'Test',
  gender: 'other',
  academic_level: 'proficient',
  academic_score: 50,
  behavior_level: 'good',
  behavior_score: 50,
  friends_ids: [],
  incompatible_ids: [],
  special_needs: [],
  requires_front_row: false,
  requires_quiet_area: false,
  has_mobility_issues: false,
  is_bilingual: false,
  ...over,
});

describe('surveyToStudentPatch', () => {
  it('maps seatmates to friends_ids', () => {
    const patch = surveyToStudentPatch('s1', { ...emptyAnswers(), seatmates: ['a', 'b'] });
    expect(patch.friends_ids).toEqual(['a', 'b']);
  });

  it('strips self-nomination and duplicates, and caps at MAX_SEATMATES', () => {
    const patch = surveyToStudentPatch('s1', {
      ...emptyAnswers(),
      seatmates: ['s1', 'a', 'a', 'b', 'c', 'd'],
    });
    expect(patch.friends_ids).not.toContain('s1');
    expect(patch.friends_ids).toEqual(['a', 'b', 'c']);
    expect(patch.friends_ids!.length).toBe(MAX_SEATMATES);
  });

  it('sets requires_front_row when focus is front', () => {
    expect(surveyToStudentPatch('s1', { ...emptyAnswers(), focusZone: 'front' }).requires_front_row).toBe(true);
    expect(surveyToStudentPatch('s1', { ...emptyAnswers(), focusZone: 'back' }).requires_front_row).toBe(false);
  });

  it('sets requires_front_row when the student needs the board clear', () => {
    expect(surveyToStudentPatch('s1', { ...emptyAnswers(), needBoardClear: true }).requires_front_row).toBe(true);
  });

  it('sets requires_quiet_area only when noise === yes', () => {
    expect(surveyToStudentPatch('s1', { ...emptyAnswers(), noise: 'yes' }).requires_quiet_area).toBe(true);
    expect(surveyToStudentPatch('s1', { ...emptyAnswers(), noise: 'somewhat' }).requires_quiet_area).toBe(false);
    expect(surveyToStudentPatch('s1', { ...emptyAnswers(), noise: 'no' }).requires_quiet_area).toBe(false);
  });
});

describe('applyWindowPreference', () => {
  it('adds the student when they prefer a window', () => {
    const next = applyWindowPreference(baseConstraints, 's1', true);
    expect(next.near_window_ids).toEqual(['s1']);
  });

  it('removes the student when they no longer prefer a window', () => {
    const next = applyWindowPreference({ ...baseConstraints, near_window_ids: ['s1', 's2'] }, 's1', false);
    expect(next.near_window_ids).toEqual(['s2']);
  });

  it('returns the SAME reference when a null preference leaves state unchanged', () => {
    expect(applyWindowPreference(baseConstraints, 's1', null)).toBe(baseConstraints);
  });

  it('returns the same reference when already present and still preferred (no-op)', () => {
    const c = { ...baseConstraints, near_window_ids: ['s1'] };
    expect(applyWindowPreference(c, 's1', true)).toBe(c);
  });
});

describe('applyMentorPreference', () => {
  it('adds a mentor pair (mentor-first) for the student as mentee', () => {
    const next = applyMentorPreference(baseConstraints, 's1', 'helper1');
    expect(next.peer_mentor_pairs).toEqual([['helper1', 's1']]);
  });

  it('replaces an existing mentor for the same mentee', () => {
    const c = { ...baseConstraints, peer_mentor_pairs: [['old', 's1']] as [string, string][] };
    const next = applyMentorPreference(c, 's1', 'new');
    expect(next.peer_mentor_pairs).toEqual([['new', 's1']]);
  });

  it('does not disturb other students\' mentor pairs', () => {
    const c = { ...baseConstraints, peer_mentor_pairs: [['m', 's2']] as [string, string][] };
    const next = applyMentorPreference(c, 's1', 'helper1');
    expect(next.peer_mentor_pairs).toEqual([['m', 's2'], ['helper1', 's1']]);
  });

  it('clears the mentor when helper is null', () => {
    const c = { ...baseConstraints, peer_mentor_pairs: [['old', 's1']] as [string, string][] };
    expect(applyMentorPreference(c, 's1', null).peer_mentor_pairs).toEqual([]);
  });

  it('ignores a self-nominated mentor', () => {
    expect(applyMentorPreference(baseConstraints, 's1', 's1')).toBe(baseConstraints);
  });

  it('returns the same reference when nothing changes', () => {
    expect(applyMentorPreference(baseConstraints, 's1', null)).toBe(baseConstraints);
    const c = { ...baseConstraints, peer_mentor_pairs: [['m', 's1']] as [string, string][] };
    expect(applyMentorPreference(c, 's1', 'm')).toBe(c);
  });

  it('round-trips via answersFromStudent', () => {
    const c = { ...baseConstraints, peer_mentor_pairs: [['m', 's1']] as [string, string][] };
    expect(answersFromStudent(makeStudent(), c).helper).toBe('m');
  });
});

describe('answersFromStudent', () => {
  it('round-trips seatmates from friends_ids (capped)', () => {
    const s = makeStudent({ friends_ids: ['a', 'b', 'c', 'd'] });
    expect(answersFromStudent(s, baseConstraints).seatmates).toEqual(['a', 'b', 'c']);
  });

  it('reflects requires_quiet_area as noise=yes and window membership', () => {
    const s = makeStudent({ requires_quiet_area: true });
    const a = answersFromStudent(s, { ...baseConstraints, near_window_ids: ['s1'] });
    expect(a.noise).toBe('yes');
    expect(a.preferWindow).toBe(true);
  });

  it('leaves preferWindow null when the student is not in the window list', () => {
    expect(answersFromStudent(makeStudent(), baseConstraints).preferWindow).toBeNull();
  });
});
