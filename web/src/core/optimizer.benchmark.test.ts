// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ClassroomOptimizer } from './optimizer';
import type {
  GeneticConfig,
  ObjectiveWeights,
  SeatingConstraints,
  SeatingStrategy,
  Student,
} from '../types';

const weights: ObjectiveWeights = {
  academic_balance: 0.3,
  behavioral_balance: 0.3,
  diversity: 0.2,
  special_needs: 0.2,
};

function roster(size: number): Student[] {
  return Array.from({ length: size }, (_, index) => ({
    id: `student-${index}`,
    name: `Synthetic ${index}`,
    gender: index % 3 === 0 ? 'female' : index % 3 === 1 ? 'male' : 'other',
    academic_level: index % 4 === 0 ? 'advanced' : index % 4 === 1 ? 'proficient' : index % 4 === 2 ? 'basic' : 'below_basic',
    academic_score: 30 + ((index * 17) % 66),
    behavior_level: index % 5 === 0 ? 'challenging' : index % 2 === 0 ? 'excellent' : 'good',
    behavior_score: 38 + ((index * 23) % 61),
    friends_ids: index + 1 < size && index % 5 === 0 ? [`student-${index + 1}`] : [],
    incompatible_ids: index + 2 < size && index % 7 === 0 ? [`student-${index + 2}`] : [],
    special_needs: [],
    requires_front_row: index < 2,
    requires_quiet_area: index % 13 === 0,
    has_mobility_issues: index === 2,
    is_bilingual: index % 4 === 0,
  })) as Student[];
}

function constraintsFor(size: number): SeatingConstraints {
  return {
    separate_pairs: size >= 4 ? [['student-0', 'student-2']] : [],
    keep_together_pairs: size >= 6 ? [['student-4', 'student-5']] : [],
    front_row_ids: ['student-0', 'student-1'],
    back_row_ids: [],
    aisle_ids: ['student-2'],
    near_window_ids: [],
    peer_mentor_pairs: size >= 8 ? [['student-6', 'student-7']] : [],
    hard: { front_row_ids: true, separate_pairs: true },
  };
}

const scenarios: Array<{
  name: string;
  students: number;
  rows: number;
  cols: number;
  strategy: SeatingStrategy;
  maxMs: number;
}> = [
  { name: 'small', students: 12, rows: 3, cols: 4, strategy: 'similar', maxMs: 500 },
  { name: 'typical', students: 30, rows: 5, cols: 6, strategy: 'mixed', maxMs: 1_000 },
  { name: 'large', students: 48, rows: 6, cols: 8, strategy: 'peer_support', maxMs: 2_000 },
];

describe('optimizer performance and quality guardrails', () => {
  for (const scenario of scenarios) {
    it(`${scenario.name}: stays responsive and improves a fixed baseline`, () => {
      const students = roster(scenario.students);
      const constraints = constraintsFor(scenario.students);
      const config: GeneticConfig = {
        populationSize: scenario.students <= 12 ? 30 : 50,
        maxGenerations: scenario.students <= 30 ? 60 : 80,
        crossoverRate: 0.8,
        mutationRate: 0.2,
        tournamentSize: 3,
        earlyStopPatience: 20,
        multiStart: 1,
        seed: 20260915,
        seatingStrategy: scenario.strategy,
      };
      const configure = () => {
        const optimizer = new ClassroomOptimizer(students, scenario.rows, scenario.cols);
        optimizer.setWeights(weights);
        optimizer.setConfig(config);
        optimizer.setConstraints(constraints);
        return optimizer;
      };

      const started = performance.now();
      const result = configure().optimize();
      const elapsed = performance.now() - started;
      const ids = result.layout.seats.flatMap((seat) => seat.student_id ? [seat.student_id] : []);

      const baselineSeats = result.layout.seats.map((seat, index) => ({
        ...seat,
        student_id: students[index]?.id,
        is_empty: index >= students.length,
      }));
      const baseline = configure().evaluateSeating(baselineSeats);

      console.info(JSON.stringify({
        scenario: scenario.name,
        students: scenario.students,
        elapsedMs: Math.round(elapsed),
        fitness: Number(result.fitness_score.toFixed(3)),
        baselineFitness: Number(baseline.fitness_score.toFixed(3)),
        generations: result.generations,
      }));

      expect(elapsed).toBeLessThan(scenario.maxMs);
      expect(ids).toHaveLength(scenario.students);
      expect(new Set(ids).size).toBe(scenario.students);
      expect([...ids].sort()).toEqual(students.map((student) => student.id).sort());
      expect(result.unmet_hard_rules ?? 0).toBe(0);
      expect(result.fitness_score).toBeGreaterThanOrEqual(baseline.fitness_score);
      for (const score of Object.values(result.objective_scores)) {
        expect(Number.isFinite(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }, scenario.maxMs + 2_000);
  }
});
