/**
 * Tests for the ClassroomOptimizer (Genetic Algorithm)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClassroomOptimizer, mulberry32 } from './optimizer';
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

    it('separates a recently-adjacent pair when rotation avoidance is on', () => {
      const optimizer = new ClassroomOptimizer(students, 3, 4);
      optimizer.setRng(mulberry32(42));
      // Strong penalty on the (1,4) pair, well above the objective scale, so
      // the GA prefers any arrangement that keeps them apart.
      optimizer.setRotationAvoidance({ '1|4': 1 }, 2);

      const result = optimizer.optimize();
      const pos1 = result.student_positions['1'];
      const pos4 = result.student_positions['4'];
      const distance =
        Math.abs(pos1.row - pos4.row) + Math.abs(pos1.col - pos4.col);
      expect(distance).toBeGreaterThan(1); // Not adjacent
    });

    it('never seats a student on a blocked (desk/obstacle) cell', () => {
      const optimizer = new ClassroomOptimizer(students, {
        type: 'rows',
        rows: 3,
        cols: 3,
        blockedCells: [
          { row: 0, col: 1, kind: 'desk' },
          { row: 1, col: 1, kind: 'obstacle' },
        ],
      });
      const result = optimizer.optimize();
      // 9 - 2 blocked = 7 seats; none at the blocked coordinates.
      expect(result.layout.seats).toHaveLength(7);
      for (const seat of result.layout.seats) {
        const blocked =
          (seat.position.row === 0 && seat.position.col === 1) ||
          (seat.position.row === 1 && seat.position.col === 1);
        expect(blocked).toBe(false);
      }
      // All 4 students still placed (7 seats ≥ 4 students).
      expect(result.layout.seats.filter((s) => !s.is_empty)).toHaveLength(4);
    });

    it('rotation avoidance is inert when strength is 0', () => {
      // A penalty table with zero strength must not change the contract:
      // every student still gets a seat and a valid result is returned.
      const optimizer = new ClassroomOptimizer(students, 2, 2);
      optimizer.setRotationAvoidance({ '1|4': 1 }, 0);
      const result = optimizer.optimize();
      const assigned = result.layout.seats.filter((s) => !s.is_empty);
      expect(assigned.length).toBe(students.length);
    });

    it('keeps front_row_ids in row 0 across GA evolution (not just seeding)', () => {
      // Alice has no accessibility flags — the only reason for her to be in
      // row 0 is the front_row_ids rule. Previously this was used only to
      // seed the initial chromosome and the GA could drift away from it.
      const optimizer = new ClassroomOptimizer(students, 3, 4);
      optimizer.setConfig({
        populationSize: 30,
        maxGenerations: 60,
        crossoverRate: 0.8,
        mutationRate: 0.3,
        tournamentSize: 3,
        earlyStopPatience: 100, // disable early stop so we exercise drift
      });
      optimizer.setConstraints({
        separate_pairs: [],
        keep_together_pairs: [],
        front_row_ids: ['1'], // Alice
        back_row_ids: [],
      });

      const result = optimizer.optimize();
      expect(result.student_positions['1'].row).toBe(0);
    });

    it('keeps back_row_ids in the last row after evolution', () => {
      const optimizer = new ClassroomOptimizer(students, 3, 4);
      optimizer.setConfig({
        populationSize: 30,
        maxGenerations: 60,
        crossoverRate: 0.8,
        mutationRate: 0.3,
        tournamentSize: 3,
        earlyStopPatience: 100,
      });
      optimizer.setConstraints({
        separate_pairs: [],
        keep_together_pairs: [],
        front_row_ids: [],
        back_row_ids: ['2'], // Bob
      });

      const result = optimizer.optimize();
      expect(result.student_positions['2'].row).toBe(2); // last row of 3
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

  describe('Multi-start', () => {
    it('runs successfully with multiStart undefined (back-compat with old configs)', () => {
      const optimizer = new ClassroomOptimizer(students, 3, 4);
      optimizer.setConfig({ ...config, multiStart: undefined });
      const result = optimizer.optimize();
      expect(result.fitness_score).toBeGreaterThan(0);
      expect(result.layout.seats.filter((s) => !s.is_empty).length).toBe(students.length);
    });

    it('runs successfully with multiStart=3', () => {
      const optimizer = new ClassroomOptimizer(students, 3, 4);
      optimizer.setConfig({ ...config, multiStart: 3 });
      const result = optimizer.optimize();
      expect(result.fitness_score).toBeGreaterThan(0);
    });

    it('clamps multiStart=0 to 1 (still produces a valid result)', () => {
      const optimizer = new ClassroomOptimizer(students, 3, 4);
      optimizer.setConfig({ ...config, multiStart: 0 });
      const result = optimizer.optimize();
      expect(result.fitness_score).toBeGreaterThan(0);
    });

    it('clamps multiStart=100 to 10 (no runaway loop)', () => {
      const optimizer = new ClassroomOptimizer(students, 3, 4);
      optimizer.setConfig({ ...config, multiStart: 100, maxGenerations: 10 });
      const start = performance.now();
      const result = optimizer.optimize();
      const elapsed = performance.now() - start;
      expect(result.fitness_score).toBeGreaterThan(0);
      // Generous ceiling: 10 starts × tiny config should finish well under 5s.
      expect(elapsed).toBeLessThan(5000);
    });

    it('multiStart=5 wins or ties single-start most of the time', () => {
      // Statistical claim: with 5 independent restarts the GA should hit a
      // local optimum at least as good as a lone run. Allow ~20% noise:
      // multi-start must win or tie in ≥ 4 of 5 trials.
      let wins = 0;
      for (let i = 0; i < 5; i++) {
        const single = new ClassroomOptimizer(students, 3, 4);
        single.setConfig({ ...config, multiStart: 1 });
        const singleResult = single.optimize();

        const multi = new ClassroomOptimizer(students, 3, 4);
        multi.setConfig({ ...config, multiStart: 5 });
        const multiResult = multi.optimize();

        if (multiResult.fitness_score >= singleResult.fitness_score) wins++;
      }
      expect(wins).toBeGreaterThanOrEqual(4);
    });

    it('produces identical results across runs when seeded with the same RNG', () => {
      // Determinism check: same seed + same input must yield identical
      // student_positions. This is the bedrock guarantee that lets us
      // ship "reproducible runs" features later.
      const opt1 = new ClassroomOptimizer(students, 3, 4);
      opt1.setConfig({ ...config, multiStart: 3 });
      opt1.setRng(mulberry32(12345));
      const r1 = opt1.optimize();

      const opt2 = new ClassroomOptimizer(students, 3, 4);
      opt2.setConfig({ ...config, multiStart: 3 });
      opt2.setRng(mulberry32(12345));
      const r2 = opt2.optimize();

      expect(r1.fitness_score).toBe(r2.fitness_score);
      expect(r1.student_positions).toEqual(r2.student_positions);
    });

    it('different seeds yield different search trajectories', () => {
      // Sanity check that the seed actually affects the output — guards
      // against accidentally ignoring the RNG.
      const opt1 = new ClassroomOptimizer(students, 5, 6);
      opt1.setConfig({ ...config, multiStart: 1, maxGenerations: 20 });
      opt1.setRng(mulberry32(1));
      const r1 = opt1.optimize();

      const opt2 = new ClassroomOptimizer(students, 5, 6);
      opt2.setConfig({ ...config, multiStart: 1, maxGenerations: 20 });
      opt2.setRng(mulberry32(99999));
      const r2 = opt2.optimize();

      // With only 4 students in a 5x6 grid the search space is huge —
      // different seeds essentially never converge on the same layout.
      expect(r1.student_positions).not.toEqual(r2.student_positions);
    });

    it('actually performs N independent restarts (Math.random call-count scales)', () => {
      // Each restart rebuilds the population via shuffle() and runs the GA
      // loop, both of which consume Math.random. multiStart=5 should call
      // Math.random meaningfully more often than multiStart=1 on the same
      // input. We assert "at least 2x" — well below the true ~5x ratio,
      // leaves headroom for early-stop variance.
      const original = Math.random;
      let count1 = 0;
      let count5 = 0;

      Math.random = (() => { count1++; return original(); }) as typeof Math.random;
      const opt1 = new ClassroomOptimizer(students, 3, 4);
      opt1.setConfig({ ...config, multiStart: 1, maxGenerations: 20, earlyStopPatience: 100 });
      opt1.optimize();

      Math.random = (() => { count5++; return original(); }) as typeof Math.random;
      const opt5 = new ClassroomOptimizer(students, 3, 4);
      opt5.setConfig({ ...config, multiStart: 5, maxGenerations: 20, earlyStopPatience: 100 });
      opt5.optimize();

      Math.random = original;
      expect(count5).toBeGreaterThan(count1 * 2);
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
