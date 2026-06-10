import { describe, it, expect } from 'vitest';
import { sanitizeSuggestions } from './aiSuggestRules';
import type { Student, SeatingConstraints } from '../types';

const student = (id: string, name: string): Student =>
  ({
    id,
    name,
    gender: 'male',
    academic_level: 'proficient',
    academic_score: 70,
    behavior_level: 'medium',
    behavior_score: 70,
    special_needs: [],
    friends_ids: [],
    incompatible_ids: [],
    requires_front_row: false,
    requires_quiet_area: false,
    has_mobility_issues: false,
    is_bilingual: false,
    notes: '',
  }) as unknown as Student;

const students = [student('s1', 'Alice'), student('s2', 'Bob'), student('s3', 'Dana')];

const empty: SeatingConstraints = {
  separate_pairs: [],
  keep_together_pairs: [],
  front_row_ids: [],
  back_row_ids: [],
};

describe('sanitizeSuggestions', () => {
  it('keeps well-formed suggestions and maps all three kinds', () => {
    const out = sanitizeSuggestions(
      {
        suggestions: [
          { kind: 'separate', a: 's1', b: 's2', reason: 'argue' },
          { kind: 'keep_together', a: 's2', b: 's3', reason: 'help each other' },
          { kind: 'front_row', a: 's3', reason: 'eyesight' },
        ],
      },
      students,
      empty,
    );
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ kind: 'separate', a: 's1', b: 's2', reason: 'argue' });
    expect(out[2]).toEqual({ kind: 'front_row', a: 's3', reason: 'eyesight' });
  });

  it('drops unknown ids, self-pairs, bad kinds, and malformed entries', () => {
    const out = sanitizeSuggestions(
      {
        suggestions: [
          { kind: 'separate', a: 's1', b: 'ghost', reason: '' },
          { kind: 'separate', a: 's1', b: 's1', reason: '' },
          { kind: 'expel', a: 's1', b: 's2', reason: '' },
          { kind: 'separate', a: 42, b: 's2', reason: '' },
          'nonsense',
          null,
        ],
      },
      students,
      empty,
    );
    expect(out).toHaveLength(0);
  });

  it('dedupes against existing constraints (order-insensitive) and within itself', () => {
    const existing: SeatingConstraints = {
      ...empty,
      separate_pairs: [['s2', 's1']],
      front_row_ids: ['s3'],
    };
    const out = sanitizeSuggestions(
      {
        suggestions: [
          { kind: 'separate', a: 's1', b: 's2', reason: 'already exists' },
          { kind: 'front_row', a: 's3', reason: 'already exists' },
          { kind: 'keep_together', a: 's1', b: 's3', reason: 'new' },
          { kind: 'keep_together', a: 's3', b: 's1', reason: 'duplicate of previous' },
        ],
      },
      students,
      existing,
    );
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('keep_together');
  });

  it('tolerates garbage payloads and caps the list', () => {
    expect(sanitizeSuggestions(null, students, empty)).toEqual([]);
    expect(sanitizeSuggestions({ suggestions: 'no' }, students, empty)).toEqual([]);
    const many = {
      suggestions: students.flatMap((a) =>
        students.map((b) => ({ kind: 'separate', a: a.id, b: b.id, reason: 'x' })),
      ).concat(
        Array.from({ length: 30 }, (_, i) => ({
          kind: 'front_row',
          a: students[i % 3].id,
          b: undefined as unknown as string,
          reason: 'x',
        })),
      ),
    };
    expect(sanitizeSuggestions(many, students, empty).length).toBeLessThanOrEqual(12);
  });
});
