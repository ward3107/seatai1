/**
 * Tests for the ClassroomOptimizer (Genetic Algorithm)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClassroomOptimizer } from './optimizer';
import type { Student, ObjectiveWeights, GeneticConfig, SeatingConstraints } from '../types';

describe('ClassroomOptimizer', () => {
  let students: Student[];
  let weights: ObjectiveWeights;
  let config: GeneticConfig;

  beforeEach(() => {
    // Create sample students
    students = [
      {
        id: '1',
        name: 'Alice',
        gender: 'female',
        academic_level: 'advanced',
        academic_score: 90,
        behavior_level: 'excellent',
        behavior_score: 95,
        friends_ids: ['2'],
        incompatible_ids: ['4'],
        special_needs: [],
        requires_front_row: false,
        requires_quiet_area: false,
        has_mobility_issues: false,
        is_bilingual: false
      },
      {
        id: '2',
        name: 'Bob',
        gender: 'male',
        academic_level: 'proficient',
        academic_score: 75,
        behavior_level: 'good',
        behavior_score: 80,
        friends_ids: ['1'],
        incompatible_ids: [],
        special_needs: [],
        requires_front_row: false,
        requires_quiet_area: false,
        has_mobility_issues: false,
        is_bilingual: false
      },
      {
        id: '3',
        name: 'Charlie',
        gender: 'male',
        academic_level: 'basic',
        academic_score: 50,
        behavior_level: 'challenging',
        behavior_score: 40,
        friends_ids: [],
        incompatible_ids: [],
        special_needs: [],
        requires_front_row: true,
        requires_quiet_area: false,
        has_mobility_issues: false,
        is_bilingual: false
      },
      {
        id: '4',
        name: 'Diana',
        gender: 'female',
        academic_level: 'below_basic',
        academic_score: 30,
        behavior_level: 'average',
        behavior_score: 60,
        friends_ids: [],
        incompatible_ids: ['1'],
        special_needs: [],
        requires_front_row: false,
        requires_quiet_area: true,
        has_mobility_issues: false,
        is_bilingual: false
      }
    ];

    weights = {
      academic_balance: 0.3,
      behavioral_balance: 0.3,
      diversity: 0.2,
      special_needs: 0.2
    };

    config = {
      populationSize: 20,
      maxGenerations: 30,
      crossoverRate: 0.8,
      mutationRate: 0.2,
      tournamentSize: 3,
      earlyStopPatience: 10
    };
  });

  describe('Initialization', () => {
    it('should create optimizer with students and dimensions', () => {
      const optimizer = new ClassroomOptimizer(students, 3, 4);
      expect(optimizer).toBeDefined();
    });

    it('should accept custom weights', () => {
      const optimizer = new ClassroomOptimizer(students, 3, 4);
      optimizer.setWeights(weights);
      // No error thrown = success
      expect(optimizer).toBeDefined();
    });

    it('should accept custom config', () => {
      const optimizer = new ClassroomOptimizer(students, 3, 4);
      optimizer.setConfig(config);
      expect(optimizer).toBeDefined();
    });

    it('should accept constraints', () => {
      const constraints: SeatingConstraints = {
        separate_pairs: [['1', '4']],
        keep_together_pairs: [['1', '2']],
        front_row_ids: ['3'],
        back_row_ids: []
      };
      const optimizer = new ClassroomOptimizer(students, 3, 4);
      optimizer.setConstraints(constraints);
      expect(optimizer).toBeDefined();
    });
  });

  describe('Optimization', () => {
    it('should produce a valid optimization result', () => {
      const optimizer = new ClassroomOptimizer(students, 2, 2);
      const result = optimizer.optimize();

      expect(result).toBeDefined();
      expect(result.layout).toBeDefined();
      expect(result.fitness_score).toBeGreaterThan(0);
      expect(result.objective_scores).toBeDefined();
      expect(result.generations).toBeGreaterThan(0);
      expect(result.computation_time_ms).toBeGreaterThan(0);
    });

    it('should assign all students to seats', () => {
      const optimizer = new ClassroomOptimizer(students, 2, 2);
      const result = optimizer.optimize();

      const assignedSeats = result.layout.seats.filter(s => !s.is_empty);
      expect(assignedSeats.length).toBe(students.length);
    });

    it('should create correct number of seats', () => {
      const rows = 3;
      const cols = 4;
      const optimizer = new ClassroomOptimizer(students, rows, cols);
      const result = optimizer.optimize();

      expect(result.layout.total_seats).toBe(rows * cols);
      expect(result.layout.seats.length).toBe(rows * cols);
    });

    it('should return student positions', () => {
      const optimizer = new ClassroomOptimizer(students, 2, 2);
      const result = optimizer.optimize();

      expect(Object.keys(result.student_positions).length).toBe(students.length);
      students.forEach(student => {
        expect(result.student_positions[student.id]).toBeDefined();
      });
    });

    it('should complete in reasonable time', () => {
      const optimizer = new ClassroomOptimizer(students, 5, 6);
      const start = performance.now();
      const result = optimizer.optimize();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000); // 5 seconds max
      expect(result.computation_time_ms).toBeLessThan(5000);
    });
  });

  describe('Constraints', () => {
    it('should place front-row students in row 0', () => {
      const frontRowStudent = students[2]; // Charlie requires front row
      const optimizer = new ClassroomOptimizer(students, 3, 4);
      optimizer.setConstraints({
        separate_pairs: [],
        keep_together_pairs: [],
        front_row_ids: [frontRowStudent.id],
        back_row_ids: []
      });

      const result = optimizer.optimize();
      const position = result.student_positions[frontRowStudent.id];

      expect(position.row).toBe(0);
    });

    it('should separate incompatible pairs', () => {
      const optimizer = new ClassroomOptimizer(students, 3, 4);
      optimizer.setConstraints({
        separate_pairs: [['1', '4']], // Alice and Diana incompatible
        keep_together_pairs: [],
        front_row_ids: [],
        back_row_ids: []
      });

      const result = optimizer.optimize();
      const pos1 = result.student_positions['1'];
      const pos4 = result.student_positions['4'];

      // Calculate distance
      const distance = Math.abs(pos1.row - pos4.row) + Math.abs(pos1.col - pos4.col);
      expect(distance).toBeGreaterThan(1); // Not adjacent
    });
  });

  describe('Objective Scores', () => {
    it('should return valid objective scores', () => {
      const optimizer = new ClassroomOptimizer(students, 2, 2);
      const result = optimizer.optimize();

      const { academic_balance, behavioral_balance, diversity, special_needs } =
        result.objective_scores;

      expect(academic_balance).toBeGreaterThanOrEqual(0);
      expect(academic_balance).toBeLessThanOrEqual(100);
      expect(behavioral_balance).toBeGreaterThanOrEqual(0);
      expect(behavioral_balance).toBeLessThanOrEqual(100);
      expect(diversity).toBeGreaterThanOrEqual(0);
      expect(diversity).toBeLessThanOrEqual(100);
      expect(special_needs).toBeGreaterThanOrEqual(0);
      expect(special_needs).toBeLessThanOrEqual(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle more students than seats', () => {
      const optimizer = new ClassroomOptimizer(students, 1, 2); // Only 2 seats
      const result = optimizer.optimize();

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Too many students'))).toBe(true);
    });

    it('should handle empty student list', () => {
      const optimizer = new ClassroomOptimizer([], 3, 4);
      const result = optimizer.optimize();

      expect(result.layout.seats.filter(s => !s.is_empty).length).toBe(0);
    });

    it('should handle single student', () => {
      const singleStudent = [students[0]];
      const optimizer = new ClassroomOptimizer(singleStudent, 1, 1);
      const result = optimizer.optimize();

      expect(result.student_positions[singleStudent[0].id]).toBeDefined();
    });
  });
});
