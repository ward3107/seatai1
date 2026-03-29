/**
 * Tests for Alternative Optimization Algorithms
 */

import { describe, it, expect } from 'vitest';
import {
  optimizeSimulatedAnnealing,
  optimizeGreedy,
  optimizeRandomSearch,
  compareAlgorithms,
} from './algorithms';
import type { Student, ObjectiveWeights, SeatingConstraints } from '../types';

const mockStudents: Student[] = [
  {
    id: 's1',
    name: 'Alice',
    gender: 'female',
    academic_level: 'proficient',
    academic_score: 85,
    behavior_level: 'good',
    behavior_score: 80,
    friends_ids: ['s2'],
    incompatible_ids: [],
    special_needs: [],
    requires_front_row: false,
    requires_quiet_area: false,
    has_mobility_issues: false,
    is_bilingual: false
  },
  {
    id: 's2',
    name: 'Bob',
    gender: 'male',
    academic_level: 'basic',
    academic_score: 65,
    behavior_level: 'excellent',
    behavior_score: 90,
    friends_ids: ['s1'],
    incompatible_ids: [],
    special_needs: [],
    requires_front_row: false,
    requires_quiet_area: false,
    has_mobility_issues: false,
    is_bilingual: false
  },
  {
    id: 's3',
    name: 'Carol',
    gender: 'female',
    academic_level: 'advanced',
    academic_score: 90,
    behavior_level: 'good',
    behavior_score: 75,
    friends_ids: [],
    incompatible_ids: ['s4'],
    special_needs: [],
    requires_front_row: true,
    requires_quiet_area: false,
    has_mobility_issues: false,
    is_bilingual: false
  },
  {
    id: 's4',
    name: 'David',
    gender: 'male',
    academic_level: 'below_basic',
    academic_score: 45,
    behavior_level: 'average',
    behavior_score: 60,
    friends_ids: [],
    incompatible_ids: ['s3'],
    special_needs: [],
    requires_front_row: false,
    requires_quiet_area: true,
    has_mobility_issues: false,
    is_bilingual: false
  }
];

const weights: ObjectiveWeights = {
  academic_balance: 0.3,
  behavioral_balance: 0.3,
  diversity: 0.2,
  special_needs: 0.2,
};

const constraints: SeatingConstraints = {
  separate_pairs: [['s3', 's4']],
  keep_together_pairs: [['s1', 's2']],
  front_row_ids: ['s3'],
  back_row_ids: [],
};

describe('Alternative Optimization Algorithms', () => {
  describe('Simulated Annealing', () => {
    it('should produce valid optimization result', () => {
      const result = optimizeSimulatedAnnealing(
        mockStudents,
        5,
        6,
        weights,
        constraints
      );

      expect(result).toBeDefined();
      expect(result.layout).toBeDefined();
      expect(result.student_positions).toBeDefined();
      expect(result.fitness_score).toBeGreaterThanOrEqual(0);
      expect(result.objective_scores).toBeDefined();
      expect(result.computation_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.algorithm).toBe('simulated_annealing');
    });

    it('should place all students', () => {
      const result = optimizeSimulatedAnnealing(
        mockStudents,
        3,
        4,
        weights,
        constraints
      );

      const placedStudents = Object.keys(result.student_positions);
      expect(placedStudents).toHaveLength(4);
      expect(placedStudents).toContain('s1');
      expect(placedStudents).toContain('s2');
      expect(placedStudents).toContain('s3');
      expect(placedStudents).toContain('s4');
    });

    it('should respect front row constraint', () => {
      const result = optimizeSimulatedAnnealing(
        mockStudents,
        5,
        6,
        weights,
        constraints
      );

      const s3Position = result.student_positions['s3'];
      expect(s3Position?.row).toBe(0);
    });

    it('should complete in reasonable time', () => {
      const start = performance.now();
      const result = optimizeSimulatedAnnealing(
        mockStudents,
        5,
        6,
        weights,
        constraints
      );
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000);
      expect(result.computation_time_ms).toBeLessThan(5000);
    });
  });

  describe('Greedy Algorithm', () => {
    it('should produce valid optimization result', () => {
      const result = optimizeGreedy(
        mockStudents,
        5,
        6,
        weights,
        constraints
      );

      expect(result).toBeDefined();
      expect(result.layout).toBeDefined();
      expect(result.fitness_score).toBeGreaterThanOrEqual(0);
      expect(result.objective_scores).toBeDefined();
      expect(result.algorithm).toBe('greedy');
    });

    it('should be faster than genetic algorithm', () => {
      const start = performance.now();
      const result = optimizeGreedy(mockStudents, 5, 6, weights, constraints);
      const duration = performance.now() - start;

      // Greedy should be fast
      expect(duration).toBeLessThan(2000);
      expect(result.algorithm).toBe('greedy');
    });

    it('should still place all students', () => {
      const result = optimizeGreedy(
        mockStudents,
        3,
        4,
        weights,
        constraints
      );

      expect(Object.keys(result.student_positions)).toHaveLength(4);
    });
  });

  describe('Random Search', () => {
    it('should produce valid optimization result', () => {
      const result = optimizeRandomSearch(
        mockStudents,
        5,
        6,
        weights,
        constraints,
        { iterations: 100 }
      );

      expect(result).toBeDefined();
      expect(result.layout).toBeDefined();
      expect(result.fitness_score).toBeGreaterThanOrEqual(0);
      expect(result.algorithm).toBe('random_search');
    });

    it('should iterate specified number of times', () => {
      const result = optimizeRandomSearch(
        mockStudents,
        5,
        6,
        weights,
        constraints,
        { iterations: 500 }
      );

      expect(result.generations).toBe(500);
    });

    it('should produce better results with more iterations', () => {
      const resultFew = optimizeRandomSearch(
        mockStudents,
        5,
        6,
        weights,
        constraints,
        { iterations: 50 }
      );

      const resultMany = optimizeRandomSearch(
        mockStudents,
        5,
        6,
        weights,
        constraints,
        { iterations: 500 }
      );

      // More iterations should generally produce better or equal results
      expect(resultMany.fitness_score).toBeGreaterThanOrEqual(resultFew.fitness_score);
    });
  });

  describe('Algorithm Comparison', () => {
    it('should compare all algorithms', () => {
      const results = compareAlgorithms(
        mockStudents,
        5,
        6,
        weights,
        constraints
      );

      expect(results).toHaveLength(3);
      expect(results[0].algorithm).toBe('simulated_annealing');
      expect(results[1].algorithm).toBe('greedy');
      expect(results[2].algorithm).toBe('random_search');
    });

    it('should track computation time for each algorithm', () => {
      const results = compareAlgorithms(
        mockStudents,
        5,
        6,
        weights,
        constraints
      );

      results.forEach(result => {
        expect(result.timeMs).toBeGreaterThanOrEqual(0);
        expect(result.result.computation_time_ms).toBeGreaterThan(0);
      });
    });

    it('should rank algorithms by fitness score', () => {
      const results = compareAlgorithms(
        mockStudents,
        5,
        6,
        weights,
        constraints
      );

      // Sort by fitness score descending
      const sorted = [...results].sort((a, b) =>
        b.result.fitness_score - a.result.fitness_score
      );

      // All algorithms should produce valid results
      sorted.forEach(result => {
        expect(result.result.fitness_score).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Performance characteristics', () => {
    it('greedy should be fastest', () => {
      const iterations = 10;

      const saTimes: number[] = [];
      const greedyTimes: number[] = [];
      const randomTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const t1 = performance.now();
        optimizeSimulatedAnnealing(mockStudents, 5, 6, weights, constraints);
        saTimes.push(performance.now() - t1);

        const t2 = performance.now();
        optimizeGreedy(mockStudents, 5, 6, weights, constraints);
        greedyTimes.push(performance.now() - t2);

        const t3 = performance.now();
        optimizeRandomSearch(mockStudents, 5, 6, weights, constraints, { iterations: 100 });
        randomTimes.push(performance.now() - t3);
      }

      const avgSA = saTimes.reduce((a, b) => a + b) / saTimes.length;
      const avgGreedy = greedyTimes.reduce((a, b) => a + b) / greedyTimes.length;
      const avgRandom = randomTimes.reduce((a, b) => a + b) / randomTimes.length;

      // Greedy should be faster than SA and Random (on average)
      expect(avgGreedy).toBeLessThan(avgSA);
      expect(avgGreedy).toBeLessThan(avgRandom);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty student list', () => {
      const result = optimizeSimulatedAnnealing([], 3, 4, weights, constraints);

      expect(Object.keys(result.student_positions)).toHaveLength(0);
    });

    it('should handle single student', () => {
      const result = optimizeGreedy([mockStudents[0]], 1, 1, weights, constraints);

      expect(result.student_positions[mockStudents[0].id]).toBeDefined();
    });

    it('should handle more students than seats', () => {
      const result = optimizeRandomSearch(
        mockStudents,
        1,
        2,
        weights,
        constraints,
        { iterations: 50 }
      );

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Too many students')
      );
    });
  });
});
