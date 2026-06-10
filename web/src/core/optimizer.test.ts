/**
 * Tests for the ClassroomOptimizer (Genetic Algorithm)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClassroomOptimizer, mulberry32 } from './optimizer';
import type { OptimizeProgress } from './optimizer';
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

  // ── Honest reporting: actual generations + stop reason ──────────────────
  describe('Generations & stop reason', () => {
    it('reports the generations actually run, not the configured cap', () => {
      const optimizer = new ClassroomOptimizer(students, 2, 2);
      optimizer.setConfig({ ...config, maxGenerations: 50, earlyStopPatience: 5, multiStart: 1 });
      const result = optimizer.optimize();
      // Real work is capped at maxGenerations and never zero.
      expect(result.generations).toBeGreaterThan(0);
      expect(result.generations).toBeLessThanOrEqual(50);
    });

    it('stops early with a "converged" reason on a trivial problem', () => {
      // 2 students in 4 seats converges almost immediately.
      const optimizer = new ClassroomOptimizer(students.slice(0, 2), 2, 2);
      optimizer.setConfig({ ...config, maxGenerations: 200, earlyStopPatience: 3, multiStart: 1 });
      const result = optimizer.optimize();
      expect(result.generations).toBeLessThan(200);
      expect(result.stop_reason).toBe('converged');
    });

    it('honours a wall-clock time budget and returns a usable plan', () => {
      const optimizer = new ClassroomOptimizer(students, 2, 2);
      // Big search, tiny budget → must bail out on time, still produce a result.
      optimizer.setConfig({
        ...config,
        populationSize: 400,
        maxGenerations: 5000,
        earlyStopPatience: 5000,
        multiStart: 5,
        timeLimitMs: 30,
      });
      const t0 = performance.now();
      const result = optimizer.optimize();
      const elapsed = performance.now() - t0;
      // Generous ceiling — we only assert it didn't run unbounded.
      expect(elapsed).toBeLessThan(2000);
      expect(result.fitness_score).toBeDefined();
      expect(Object.keys(result.student_positions).length).toBe(4);
    });
  });

  // ── Exam / anti-cheating mode ───────────────────────────────────────────
  describe('Exam mode', () => {
    // Six students, all the same ability, in a roomy 3x4 grid (12 seats) so
    // the optimiser has plenty of empty buffer space to spread them out.
    const sixStudents = (): Student[] =>
      Array.from({ length: 6 }, (_, i) => ({
        id: `s${i}`,
        name: `S${i}`,
        gender: i % 2 === 0 ? 'male' : 'female',
        academic_level: 'proficient',
        academic_score: 75,
        behavior_level: 'good',
        behavior_score: 80,
        friends_ids: [],
        incompatible_ids: [],
        special_needs: [],
        requires_front_row: false,
        requires_quiet_area: false,
        has_mobility_issues: false,
        is_bilingual: false,
      } as Student));

    const occupiedNeighbourCount = (
      result: ReturnType<ClassroomOptimizer['optimize']>,
    ): number => {
      const seats = result.layout.seats;
      const at = (r: number, c: number) =>
        seats.find((s) => s.position.row === r && s.position.col === c);
      let pairs = 0;
      for (const seat of seats) {
        if (!seat.student_id) continue;
        const { row, col } = seat.position;
        // count right and down neighbours to avoid double counting
        if (at(row, col + 1)?.student_id) pairs++;
        if (at(row + 1, col)?.student_id) pairs++;
      }
      return pairs;
    };

    it('spreads students out (fewer adjacent pairs than normal mode)', () => {
      const normal = new ClassroomOptimizer(sixStudents(), 3, 4);
      normal.setRng(mulberry32(42));
      normal.setConfig({ ...config, examMode: false, multiStart: 3 });
      const normalRes = normal.optimize();

      const exam = new ClassroomOptimizer(sixStudents(), 3, 4);
      exam.setRng(mulberry32(42));
      exam.setConfig({ ...config, examMode: true, multiStart: 3 });
      const examRes = exam.optimize();

      expect(occupiedNeighbourCount(examRes)).toBeLessThanOrEqual(
        occupiedNeighbourCount(normalRes),
      );
    });

    it('keeps every student seated and the result valid in exam mode', () => {
      const exam = new ClassroomOptimizer(sixStudents(), 3, 4);
      exam.setConfig({ ...config, examMode: true });
      const res = exam.optimize();
      expect(Object.keys(res.student_positions).length).toBe(6);
      expect(res.algorithm).toBe('genetic');
    });
  });

  // ── Seeded reproducible runs (config.seed) ────────────────────────────────
  describe('Seeded runs (config.seed)', () => {
    it('produces identical seat assignments for the same seed', () => {
      const run = () => {
        const opt = new ClassroomOptimizer(students, 3, 4);
        opt.setConfig({ ...config, multiStart: 2, seed: 1234 });
        return opt.optimize();
      };
      const r1 = run();
      const r2 = run();
      expect(r1.fitness_score).toBe(r2.fitness_score);
      expect(r1.student_positions).toEqual(r2.student_positions);
    });

    it('different seeds (very likely) produce different assignments', () => {
      // Roomy 5x6 grid: 4 students in 30 seats. The deterministic polish
      // step can occasionally pull two seeds into the same local optimum,
      // so check a handful of seeds and require at least two distinct
      // outcomes — different seeds must actually steer the search.
      const run = (seed: number) => {
        const opt = new ClassroomOptimizer(students, 5, 6);
        opt.setConfig({ ...config, multiStart: 1, maxGenerations: 20, seed });
        return opt.optimize();
      };
      const outcomes = new Set(
        [1, 2, 3, 4, 99999].map((seed) => JSON.stringify(run(seed).student_positions)),
      );
      expect(outcomes.size).toBeGreaterThan(1);
    });

    it('a config without seed keeps a previously injected RNG (back-compat)', () => {
      // setRng() then setConfig() without a seed must not reset the RNG —
      // this is the pre-existing seeding pathway used elsewhere in tests.
      const run = () => {
        const opt = new ClassroomOptimizer(students, 3, 4);
        opt.setRng(mulberry32(7));
        opt.setConfig({ ...config });
        return opt.optimize();
      };
      expect(run().student_positions).toEqual(run().student_positions);
    });
  });

  // ── Local-search polish (memetic step) ────────────────────────────────────
  describe('Local-search polish', () => {
    // The polish step is private; reach in for a focused unit test.
    type PolishApi = {
      fitness(c: string[], m: Map<string, Student>): number;
      localSearchPolish(
        c: string[],
        m: Map<string, Student>,
      ): { chrom: string[]; fitness: number };
    };

    it('never lowers the fitness of an arrangement', () => {
      const opt = new ClassroomOptimizer(students, 3, 4);
      const priv = opt as unknown as PolishApi;
      const studentMap = new Map(students.map((s) => [s.id, s]));
      // Deliberately bad arrangement: incompatible pair 1/4 adjacent,
      // front-row-needing Charlie (3) stuck in the middle.
      const chrom = ['1', '4', '2', '3', '', '', '', '', '', '', '', ''];
      const before = priv.fitness(chrom, studentMap);
      const polished = priv.localSearchPolish([...chrom], studentMap);
      expect(polished.fitness).toBeGreaterThanOrEqual(before);
      // Every student is still seated exactly once.
      expect([...polished.chrom].filter(Boolean).sort()).toEqual(['1', '2', '3', '4']);
    });

    it('final fitness is >= the best GA fitness observed during the run', () => {
      const opt = new ClassroomOptimizer(students, 3, 4);
      opt.setConfig({ ...config, multiStart: 2, seed: 99 });
      let gaBest = -Infinity;
      const result = opt.optimize({
        onProgress: (p) => {
          gaBest = Math.max(gaBest, p.bestFitness);
        },
      });
      expect(gaBest).toBeGreaterThan(-Infinity);
      expect(result.fitness_score).toBeGreaterThanOrEqual(gaBest);
    });
  });

  // ── Progress streaming & cancellation ─────────────────────────────────────
  describe('Progress & cancellation', () => {
    it('streams throttled, monotonic progress plus a final report', () => {
      const opt = new ClassroomOptimizer(students, 3, 4);
      opt.setConfig({
        ...config,
        maxGenerations: 50,
        earlyStopPatience: 100, // no early stop — run all 50 generations
        multiStart: 1,
        seed: 5,
      });
      const reports: OptimizeProgress[] = [];
      opt.optimize({ onProgress: (p) => reports.push(p) });

      expect(reports.length).toBeGreaterThan(1);
      // At most one report per ~10 generations, plus the final one.
      expect(reports.length).toBeLessThanOrEqual(Math.ceil(50 / 10) + 1);
      for (let i = 1; i < reports.length; i++) {
        expect(reports[i].generation).toBeGreaterThanOrEqual(reports[i - 1].generation);
        expect(reports[i].bestFitness).toBeGreaterThanOrEqual(reports[i - 1].bestFitness);
      }
      expect(reports[0].totalGenerations).toBe(50);
      expect(reports[reports.length - 1].generation).toBeLessThanOrEqual(50);
    });

    it('shouldStop ends the run early and still returns a usable plan', () => {
      const opt = new ClassroomOptimizer(students, 3, 4);
      opt.setConfig({
        ...config,
        maxGenerations: 500,
        earlyStopPatience: 1000,
        multiStart: 1,
        seed: 5,
      });
      let polls = 0;
      const result = opt.optimize({ shouldStop: () => ++polls >= 5 });
      expect(result.generations).toBeLessThan(500);
      expect(result.stop_reason).toBe('cancelled');
      // Best-so-far is still a complete, valid plan.
      expect(result.layout.seats.filter((s) => !s.is_empty)).toHaveLength(students.length);
      expect(Object.keys(result.student_positions)).toHaveLength(students.length);
    });

    it('optimizeAsync matches optimize for the same seed', async () => {
      const mk = () => {
        const opt = new ClassroomOptimizer(students, 3, 4);
        opt.setConfig({ ...config, multiStart: 2, seed: 77 });
        return opt;
      };
      const syncResult = mk().optimize();
      const asyncResult = await mk().optimizeAsync({ chunkGenerations: 7 });
      expect(asyncResult.fitness_score).toBe(syncResult.fitness_score);
      expect(asyncResult.student_positions).toEqual(syncResult.student_positions);
    });

    it('optimizeAsync honours shouldStop set between chunks', async () => {
      const opt = new ClassroomOptimizer(students, 3, 4);
      opt.setConfig({
        ...config,
        maxGenerations: 500,
        earlyStopPatience: 1000,
        multiStart: 1,
        seed: 3,
      });
      // The flag flips on the event loop — i.e. during a chunk gap — which
      // is exactly how the worker's 'cancel' message lands mid-run.
      let stop = false;
      setTimeout(() => {
        stop = true;
      }, 0);
      const result = await opt.optimizeAsync({
        chunkGenerations: 5,
        shouldStop: () => stop,
      });
      expect(result.generations).toBeLessThan(500);
      expect(Object.keys(result.student_positions)).toHaveLength(students.length);
    });
  });
});
