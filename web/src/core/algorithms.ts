/**
 * Alternative Optimization Algorithms for Classroom Seating
 *
 * Provides different optimization strategies:
 * - Simulated Annealing: Good for global optimization
 * - Greedy: Fast but may get stuck in local optima
 * - Random Search: Simple baseline
 * - Genetic Algorithm: Already implemented in optimizer.ts
 */

import type {
  Student,
  OptimizationResult,
  ObjectiveWeights,
  SeatingConstraints,
  Seat,
  SeatPosition,
  ClassroomLayout,
} from '../types';

// ── Common Helpers ─────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildLayout(
  chromosome: string[],
  rows: number,
  cols: number,
): ClassroomLayout {
  const seats: Seat[] = chromosome.map((sid, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    return {
      position: {
        row,
        col,
        is_front_row: row === 0,
        is_near_teacher: row === 0,
      },
      student_id: sid || undefined,
      is_empty: !sid,
    };
  });

  return {
    layout_type: 'rows',
    rows,
    cols,
    total_seats: rows * cols,
    seats,
  };
}

function buildStudentPositions(
  chromosome: string[],
  cols: number,
): Record<string, SeatPosition> {
  const positions: Record<string, SeatPosition> = {};
  chromosome.forEach((sid, idx) => {
    if (!sid) return;
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    positions[sid] = {
      row,
      col,
      is_front_row: row === 0,
      is_near_teacher: row === 0,
    };
  });
  return positions;
}

function calculateFitness(
  chromosome: string[],
  studentMap: Map<string, Student>,
  rows: number,
  cols: number,
  weights: ObjectiveWeights,
  constraints: SeatingConstraints,
): number {
  let score = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const sid = chromosome[idx];
      if (!sid) continue;
      const student = studentMap.get(sid);
      if (!student) continue;

      const neighbors: Student[] = [];
      const offsets = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [dr, dc] of offsets) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          const nid = chromosome[nr * cols + nc];
          if (nid) {
            const ns = studentMap.get(nid);
            if (ns) neighbors.push(ns);
          }
        }
      }

      if (neighbors.length === 0) continue;

      // Academic balance
      const avgNeighborAcademic =
        neighbors.reduce((sum, n) => sum + n.academic_score, 0) / neighbors.length;
      score +=
        weights.academic_balance *
        (1 - Math.abs(student.academic_score - avgNeighborAcademic) / 100);

      // Behavioral balance
      const avgNeighborBehavior =
        neighbors.reduce((sum, n) => sum + n.behavior_score, 0) / neighbors.length;
      score +=
        weights.behavioral_balance *
        (1 - Math.abs(student.behavior_score - avgNeighborBehavior) / 100);

      // Diversity
      const sameGender = neighbors.filter((n) => n.gender === student.gender).length;
      const diversityRatio = 1 - sameGender / neighbors.length;
      score += weights.diversity * diversityRatio;

      // Special needs: front-row requirement
      if (student.requires_front_row || student.has_mobility_issues) {
        score += weights.special_needs * (r === 0 ? 1 : -0.5);
      }

      // Quiet area: prefer edges/corners
      if (student.requires_quiet_area) {
        const isEdge = c === 0 || c === cols - 1 || r === 0 || r === rows - 1;
        score += weights.special_needs * (isEdge ? 0.5 : 0);
      }

      // Friend preference
      if (student.friends_ids.length > 0) {
        const neighborIds = new Set(
          offsets.map(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            return nr >= 0 && nr < rows && nc >= 0 && nc < cols
              ? chromosome[nr * cols + nc]
              : '';
          }).filter(Boolean),
        );
        const friendCount = student.friends_ids.filter((fid) => neighborIds.has(fid)).length;
        score += 0.1 * friendCount;
      }

      // Incompatible penalty
      const hasIncompatible = neighbors.some((n) =>
        student.incompatible_ids.includes(n.id),
      );
      if (hasIncompatible) {
        score -= 0.5;
      }
    }
  }

  // Constraint bonuses/penalties
  for (const [a, b] of constraints.separate_pairs) {
    const posA = chromosome.indexOf(a);
    const posB = chromosome.indexOf(b);
    if (posA === -1 || posB === -1) continue;
    const rA = Math.floor(posA / cols), cA = posA % cols;
    const rB = Math.floor(posB / cols), cB = posB % cols;
    if (Math.abs(rA - rB) + Math.abs(cA - cB) <= 1) {
      score -= 1;
    }
  }

  for (const [a, b] of constraints.keep_together_pairs) {
    const posA = chromosome.indexOf(a);
    const posB = chromosome.indexOf(b);
    if (posA === -1 || posB === -1) continue;
    const rA = Math.floor(posA / cols), cA = posA % cols;
    const rB = Math.floor(posB / cols), cB = posB % cols;
    const dist = Math.abs(rA - rB) + Math.abs(cA - cB);
    if (dist <= 1) {
      score += 0.5;
    }
  }

  return score;
}

function scoreObjectives(
  chromosome: string[],
  studentMap: Map<string, Student>,
  rows: number,
  cols: number,
): { academic_balance: number; behavioral_balance: number; diversity: number; special_needs: number } {
  let academicSum = 0;
  let behavioralSum = 0;
  let diversitySum = 0;
  let specialSum = 0;
  let count = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sid = chromosome[r * cols + c];
      if (!sid) continue;
      const s = studentMap.get(sid);
      if (!s) continue;
      count++;

      const offsets = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      const neighbors: Student[] = [];
      for (const [dr, dc] of offsets) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          const nid = chromosome[nr * cols + nc];
          if (nid) {
            const ns = studentMap.get(nid);
            if (ns) neighbors.push(ns);
          }
        }
      }
      if (neighbors.length === 0) continue;

      const avgA = neighbors.reduce((sum, n) => sum + n.academic_score, 0) / neighbors.length;
      academicSum += 1 - Math.abs(s.academic_score - avgA) / 100;

      const avgB = neighbors.reduce((sum, n) => sum + n.behavior_score, 0) / neighbors.length;
      behavioralSum += 1 - Math.abs(s.behavior_score - avgB) / 100;

      const sameG = neighbors.filter((n) => n.gender === s.gender).length;
      diversitySum += 1 - sameG / neighbors.length;

      if (s.requires_front_row || s.has_mobility_issues) {
        specialSum += r === 0 ? 1 : 0;
      }
    }
  }

  return {
    academic_balance: count > 0 ? Math.round((academicSum / count) * 100) : 0,
    behavioral_balance: count > 0 ? Math.round((behavioralSum / count) * 100) : 0,
    diversity: count > 0 ? Math.round((diversitySum / count) * 100) : 0,
    special_needs: count > 0 ? Math.round((specialSum / count) * 100) : 0,
  };
}

// ── Simulated Annealing ───────────────────────────────────────────────────────

interface SimulatedAnnealingConfig {
  initialTemperature: number;
  coolingRate: number;
  minTemperature: number;
  iterationsPerTemp: number;
}

const DEFAULT_SA_CONFIG: SimulatedAnnealingConfig = {
  initialTemperature: 1000,
  coolingRate: 0.95,
  minTemperature: 0.1,
  iterationsPerTemp: 50,
};

export function optimizeSimulatedAnnealing(
  students: Student[],
  rows: number,
  cols: number,
  weights: ObjectiveWeights,
  constraints: SeatingConstraints,
  config: Partial<SimulatedAnnealingConfig> = {},
): OptimizationResult {
  const t0 = performance.now();
  const warnings: string[] = [];
  const saConfig = { ...DEFAULT_SA_CONFIG, ...config };

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const totalSeats = rows * cols;
  const ids = students.map((s) => s.id);

  if (ids.length > totalSeats) {
    warnings.push(`Too many students (${ids.length}) for ${totalSeats} seats.`);
  }

  // Initialize with a random solution
  let current: string[] = shuffle(ids);
  while (current.length < totalSeats) current.push('');
  let currentFitness = calculateFitness(current, studentMap, rows, cols, weights, constraints);
  let best = [...current];
  let bestFitness = currentFitness;

  let temperature = saConfig.initialTemperature;

  while (temperature > saConfig.minTemperature) {
    for (let i = 0; i < saConfig.iterationsPerTemp; i++) {
      // Generate neighbor by swapping two random students
      const neighbor = [...current];
      const idx1 = Math.floor(Math.random() * ids.length);
      const idx2 = Math.floor(Math.random() * ids.length);
      [neighbor[idx1], neighbor[idx2]] = [neighbor[idx2], neighbor[idx1]];

      const neighborFitness = calculateFitness(neighbor, studentMap, rows, cols, weights, constraints);
      const delta = neighborFitness - currentFitness;

      // Accept if better, or with probability based on temperature
      if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
        current = neighbor;
        currentFitness = neighborFitness;

        if (currentFitness > bestFitness) {
          best = [...current];
          bestFitness = currentFitness;
        }
      }
    }

    temperature *= saConfig.coolingRate;
  }

  const computationTimeMs = performance.now() - t0;
  const layout = buildLayout(best, rows, cols);
  const studentPositions = buildStudentPositions(best, cols);
  const objectiveScores = scoreObjectives(best, studentMap, rows, cols);

  return {
    layout,
    student_positions: studentPositions,
    fitness_score: bestFitness,
    objective_scores: objectiveScores,
    generations: 1, // SA doesn't use generations
    computation_time_ms: computationTimeMs,
    warnings,
    algorithm: 'simulated_annealing',
  };
}

// ── Greedy Algorithm ───────────────────────────────────────────────────────────

interface GreedyConfig {
  shuffleAttempts: number;
}

const DEFAULT_GREEDY_CONFIG: GreedyConfig = {
  shuffleAttempts: 10,
};

export function optimizeGreedy(
  students: Student[],
  rows: number,
  cols: number,
  weights: ObjectiveWeights,
  constraints: SeatingConstraints,
  config: Partial<GreedyConfig> = {},
): OptimizationResult {
  const t0 = performance.now();
  const warnings: string[] = [];
  const greedyConfig = { ...DEFAULT_GREEDY_CONFIG, ...config };

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const totalSeats = rows * cols;
  const ids = students.map((s) => s.id);

  if (ids.length > totalSeats) {
    warnings.push(`Too many students (${ids.length}) for ${totalSeats} seats.`);
  }

  let best: string[] = [];
  let bestFitness = -Infinity;

  // Try multiple random starting points
  for (let attempt = 0; attempt < greedyConfig.shuffleAttempts; attempt++) {
    const shuffled = shuffle(ids);
    while (shuffled.length < totalSeats) shuffled.push('');

    // Greedy placement: place each student in their best available position
    const placed = new Set<string>();
    const result: string[] = new Array(totalSeats).fill('');

    for (const studentId of ids) {
      if (placed.has(studentId)) continue;

      let bestPos = -1;
      let bestPosFitness = -Infinity;

      // Find best position for this student
      for (let pos = 0; pos < totalSeats; pos++) {
        if (result[pos] && result[pos] !== studentId) continue;

        result[pos] = studentId;
        const fitness = calculateFitness(result, studentMap, rows, cols, weights, constraints);

        if (fitness > bestPosFitness) {
          bestPosFitness = fitness;
          bestPos = pos;
        }

        result[pos] = ''; // Reset for next iteration
      }

      if (bestPos !== -1) {
        result[bestPos] = studentId;
        placed.add(studentId);
      }
    }

    // Fill remaining with unplaced students
    for (const studentId of ids) {
      if (!placed.has(studentId)) {
        for (let pos = 0; pos < totalSeats; pos++) {
          if (!result[pos]) {
            result[pos] = studentId;
            break;
          }
        }
      }
    }

    const fitness = calculateFitness(result, studentMap, rows, cols, weights, constraints);
    if (fitness > bestFitness) {
      best = result;
      bestFitness = fitness;
    }
  }

  const computationTimeMs = performance.now() - t0;
  const layout = buildLayout(best, rows, cols);
  const studentPositions = buildStudentPositions(best, cols);
  const objectiveScores = scoreObjectives(best, studentMap, rows, cols);

  return {
    layout,
    student_positions: studentPositions,
    fitness_score: bestFitness,
    objective_scores: objectiveScores,
    generations: 1, // Greedy doesn't use generations
    computation_time_ms: computationTimeMs,
    warnings,
    algorithm: 'greedy',
  };
}

// ── Random Search ─────────────────────────────────────────────────────────────

interface RandomSearchConfig {
  iterations: number;
}

const DEFAULT_RANDOM_CONFIG: RandomSearchConfig = {
  iterations: 1000,
};

export function optimizeRandomSearch(
  students: Student[],
  rows: number,
  cols: number,
  weights: ObjectiveWeights,
  constraints: SeatingConstraints,
  config: Partial<RandomSearchConfig> = {},
): OptimizationResult {
  const t0 = performance.now();
  const warnings: string[] = [];
  const randomConfig = { ...DEFAULT_RANDOM_CONFIG, ...config };

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const totalSeats = rows * cols;
  const ids = students.map((s) => s.id);

  if (ids.length > totalSeats) {
    warnings.push(`Too many students (${ids.length}) for ${totalSeats} seats.`);
  }

  let best: string[] = [];
  let bestFitness = -Infinity;

  for (let i = 0; i < randomConfig.iterations; i++) {
    const candidate = shuffle(ids);
    while (candidate.length < totalSeats) candidate.push('');

    const fitness = calculateFitness(candidate, studentMap, rows, cols, weights, constraints);
    if (fitness > bestFitness) {
      best = candidate;
      bestFitness = fitness;
    }
  }

  const computationTimeMs = performance.now() - t0;
  const layout = buildLayout(best, rows, cols);
  const studentPositions = buildStudentPositions(best, cols);
  const objectiveScores = scoreObjectives(best, studentMap, rows, cols);

  return {
    layout,
    student_positions: studentPositions,
    fitness_score: bestFitness,
    objective_scores: objectiveScores,
    generations: randomConfig.iterations,
    computation_time_ms: computationTimeMs,
    warnings,
    algorithm: 'random_search',
  };
}

// ── Algorithm Comparison ─────────────────────────────────────────────────────

export type OptimizationAlgorithm = 'genetic' | 'simulated_annealing' | 'greedy' | 'random_search';

export interface AlgorithmComparison {
  algorithm: OptimizationAlgorithm;
  result: OptimizationResult;
  timeMs: number;
}

export function compareAlgorithms(
  students: Student[],
  rows: number,
  cols: number,
  weights: ObjectiveWeights,
  constraints: SeatingConstraints,
): AlgorithmComparison[] {
  const results: AlgorithmComparison[] = [];

  // Run all algorithms
  const startSA = performance.now();
  results.push({
    algorithm: 'simulated_annealing',
    result: optimizeSimulatedAnnealing(students, rows, cols, weights, constraints),
    timeMs: performance.now() - startSA,
  });

  const startGreedy = performance.now();
  results.push({
    algorithm: 'greedy',
    result: optimizeGreedy(students, rows, cols, weights, constraints),
    timeMs: performance.now() - startGreedy,
  });

  const startRandom = performance.now();
  results.push({
    algorithm: 'random_search',
    result: optimizeRandomSearch(students, rows, cols, weights, constraints),
    timeMs: performance.now() - startRandom,
  });

  return results;
}
