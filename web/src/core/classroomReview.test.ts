import { describe, expect, it } from 'vitest';
import { reviewClassroom } from './classroomReview';
import { createEmptyStudent } from '../utils/sampleData';
import type { OptimizationResult, SeatingConstraints } from '../types';

const students = ['a', 'b', 'c'].map((id) => ({ ...createEmptyStudent(), id, name: 'Same name' }));
const layout = { type: 'rows' as const, rows: 1, cols: 3 };
const constraints: SeatingConstraints = { separate_pairs: [['a', 'b']], keep_together_pairs: [], front_row_ids: [], back_row_ids: [], hard: { separate_pairs: true } };
function chart(ids: string[]): OptimizationResult {
  return {
    layout: { layout_type: 'rows', rows: 1, cols: 3, total_seats: 3, seats: ids.map((student_id, col) => ({ student_id, is_empty: false, position: { row: 0, col, is_front_row: true, is_near_teacher: true } })) },
    student_positions: {}, fitness_score: 1, objective_scores: { academic_balance: 100, behavioral_balance: 100, diversity: 100, special_needs: 100 }, generations: 1, computation_time_ms: 1, warnings: [],
  };
}
describe('reviewClassroom', () => {
  it('counts affected students by seat rather than name or paired rule', () => {
    const review = reviewClassroom(chart(['a', 'b', 'c']), students, constraints, layout);
    expect(review.affected).toHaveLength(2);
    expect(review.requiredStudents).toBe(2);
    expect(review.affected[0].reasons[0].required).toBe(true);
  });
  it('reflects manual moves even if cached positions and score are unchanged', () => {
    const review = reviewClassroom(chart(['a', 'c', 'b']), students, constraints, layout);
    expect(review.affected).toHaveLength(0);
    expect(review.requiredStudents).toBe(0);
  });
  it('does not call an unplaced student satisfied', () => {
    const review = reviewClassroom(chart(['a', 'c']), students, constraints, layout);
    expect(review.missing.map((student) => student.id)).toEqual(['b']);
  });
  it('distinguishes preferences from required rules', () => {
    const review = reviewClassroom(chart(['a', 'b', 'c']), students, { ...constraints, hard: {} }, layout);
    expect(review.affected).toHaveLength(2);
    expect(review.requiredStudents).toBe(0);
  });
});
