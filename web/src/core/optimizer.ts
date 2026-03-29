/**
 * Pure TypeScript Genetic Algorithm optimizer for classroom seating.
 * Replaces the missing WASM module with an equivalent GA implementation.
 */

import type {
  Student,
  OptimizationResult,
  ObjectiveScores,
  ObjectiveWeights,
  GeneticConfig,
  SeatingConstraints,
  Seat,
  SeatPosition,
  ClassroomLayout,
} from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

type Chromosome = string[]; // student IDs in seat order (row-major)

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── ClassroomOptimizer ─────────────────────────────────────────────────────────

export class ClassroomOptimizer {
  private students: Student[];
  private rows: number;
  private cols: number;
  private weights: ObjectiveWeights = {
    academic_balance: 0.3,
    behavioral_balance: 0.3,
    diversity: 0.2,
    special_needs: 0.2,
  };
  private config: GeneticConfig = {
    populationSize: 100,
    maxGenerations: 100,
    crossoverRate: 0.8,
    mutationRate: 0.2,
    tournamentSize: 3,
    earlyStopPatience: 20,
  };
  private constraints: SeatingConstraints = {
    separate_pairs: [],
    keep_together_pairs: [],
    front_row_ids: [],
    back_row_ids: [],
  };

  constructor(
    students: Student[],
    rows: number,
    cols: number,
  ) {
    this.students = students;
    this.rows = rows;
    this.cols = cols;
  }

  setWeights(w: ObjectiveWeights) { this.weights = { ...w }; }
  setConfig(c: GeneticConfig) { this.config = { ...c }; }
  setConstraints(c: SeatingConstraints) { this.constraints = { ...c }; }

  // ── Main entry point ──────────────────────────────────────────────────────

  optimize(): OptimizationResult {
    const t0 = performance.now();
    const warnings: string[] = [];

    const studentMap = new Map(this.students.map((s) => [s.id, s]));
    const totalSeats = this.rows * this.cols;
    const ids = this.students.map((s) => s.id);

    if (ids.length > totalSeats) {
      warnings.push(`Too many students (${ids.length}) for ${totalSeats} seats.`);
    }

    // Build initial population
    let population: Chromosome[] = [];

    // Seed one chromosome that respects constraints greedily
    const seeded = this.seedFromConstraints(ids, totalSeats);
    population.push(seeded);

    // Fill rest with random shuffles
    while (population.length < this.config.populationSize) {
      const chrom = shuffle(ids);
      // Pad with empty slots if classroom has more seats than students
      while (chrom.length < totalSeats) chrom.push('');
      population.push(chrom);
    }

    // Run GA
    let bestFitness = -Infinity;
    let bestChrom: Chromosome = population[0];
    let stagnation = 0;

    for (let gen = 0; gen < this.config.maxGenerations; gen++) {
      // Evaluate
      const scored = population.map((chrom) => ({
        chrom,
        fitness: this.fitness(chrom, studentMap),
      }));

      // Track best
      scored.sort((a, b) => b.fitness - a.fitness);
      if (scored[0].fitness > bestFitness) {
        bestFitness = scored[0].fitness;
        bestChrom = scored[0].chrom;
        stagnation = 0;
      } else {
        stagnation++;
      }

      // Early stop
      if (stagnation >= this.config.earlyStopPatience) break;

      // Selection + crossover + mutation
      const nextGen: Chromosome[] = [scored[0].chrom]; // elitism

      while (nextGen.length < this.config.populationSize) {
        const parentA = this.tournamentSelect(scored);
        const parentB = this.tournamentSelect(scored);

        let child: Chromosome;
        if (Math.random() < this.config.crossoverRate) {
          child = this.orderCrossover(parentA, parentB);
        } else {
          child = [...parentA];
        }

        if (Math.random() < this.config.mutationRate) {
          this.swapMutate(child);
        }

        nextGen.push(child);
      }

      population = nextGen;
    }

    const computationTimeMs = performance.now() - t0;

    // Build result
    const layout = this.buildLayout(bestChrom);
    const studentPositions = this.buildStudentPositions(bestChrom);
    const objectiveScores = this.scoreObjectives(bestChrom, studentMap);

    return {
      layout,
      student_positions: studentPositions,
      fitness_score: bestFitness,
      objective_scores: objectiveScores,
      generations: this.config.maxGenerations,
      computation_time_ms: computationTimeMs,
      warnings,
      algorithm: 'genetic',
    };
  }

  // ── Constraint-aware seeding ──────────────────────────────────────────────

  private seedFromConstraints(ids: string[], totalSeats: number): Chromosome {
    const chrom: Chromosome = new Array(totalSeats).fill('');
    const placed = new Set<string>();

    // Place front-row students in row 0
    for (const sid of this.constraints.front_row_ids) {
      if (!ids.includes(sid)) continue;
      for (let c = 0; c < this.cols; c++) {
        if (chrom[c] === '') {
          chrom[c] = sid;
          placed.add(sid);
          break;
        }
      }
    }

    // Place back-row students in last row
    const lastRowStart = (this.rows - 1) * this.cols;
    for (const sid of this.constraints.back_row_ids) {
      if (!ids.includes(sid) || placed.has(sid)) continue;
      for (let c = 0; c < this.cols; c++) {
        if (chrom[lastRowStart + c] === '') {
          chrom[lastRowStart + c] = sid;
          placed.add(sid);
          break;
        }
      }
    }

    // Fill remaining randomly
    const remaining = shuffle(ids.filter((id) => !placed.has(id)));
    let ri = 0;
    for (let i = 0; i < totalSeats && ri < remaining.length; i++) {
      if (chrom[i] === '') {
        chrom[i] = remaining[ri++];
      }
    }

    return chrom;
  }

  // ── Fitness function ──────────────────────────────────────────────────────

  private fitness(chrom: Chromosome, studentMap: Map<string, Student>): number {
    let score = 0;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const idx = r * this.cols + c;
        const sid = chrom[idx];
        if (!sid) continue;
        const student = studentMap.get(sid);
        if (!student) continue;

        // Neighbors (4-connected)
        const neighbors: Student[] = [];
        const offsets = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        for (const [dr, dc] of offsets) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
            const nid = chrom[nr * this.cols + nc];
            if (nid) {
              const ns = studentMap.get(nid);
              if (ns) neighbors.push(ns);
            }
          }
        }

        if (neighbors.length === 0) continue;

        // Academic balance: prefer neighbors with similar academic scores
        const avgNeighborAcademic =
          neighbors.reduce((sum, n) => sum + n.academic_score, 0) / neighbors.length;
        score +=
          this.weights.academic_balance *
          (1 - Math.abs(student.academic_score - avgNeighborAcademic) / 100);

        // Behavioral balance: prefer neighbors with similar behavior scores
        const avgNeighborBehavior =
          neighbors.reduce((sum, n) => sum + n.behavior_score, 0) / neighbors.length;
        score +=
          this.weights.behavioral_balance *
          (1 - Math.abs(student.behavior_score - avgNeighborBehavior) / 100);

        // Diversity: prefer mixed gender neighbors
        const sameGender = neighbors.filter((n) => n.gender === student.gender).length;
        const diversityRatio = 1 - sameGender / neighbors.length;
        score += this.weights.diversity * diversityRatio;

        // Special needs: front-row requirement
        if (student.requires_front_row || student.has_mobility_issues) {
          score += this.weights.special_needs * (r === 0 ? 1 : -0.5);
        }

        // Quiet area: prefer edges/corners (lower col index variation)
        if (student.requires_quiet_area) {
          const isEdge = c === 0 || c === this.cols - 1 || r === 0 || r === this.rows - 1;
          score += this.weights.special_needs * (isEdge ? 0.5 : 0);
        }

        // Friend preference: being near friends is a bonus
        if (student.friends_ids.length > 0) {
          const neighborIds = new Set(
            offsets.map(([dr, dc]) => {
              const nr = r + dr;
              const nc = c + dc;
              return nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols
                ? chrom[nr * this.cols + nc]
                : '';
            }).filter(Boolean),
          );
          const friendCount = student.friends_ids.filter((fid) => neighborIds.has(fid)).length;
          score += 0.1 * friendCount;
        }

        // Incompatible penalty: strong penalty for seating incompatible students adjacent
        const hasIncompatible = neighbors.some((n) =>
          student.incompatible_ids.includes(n.id),
        );
        if (hasIncompatible) {
          score -= 0.5;
        }
      }
    }

    // Constraint bonuses/penalties
    for (const [a, b] of this.constraints.separate_pairs) {
      const posA = chrom.indexOf(a);
      const posB = chrom.indexOf(b);
      if (posA === -1 || posB === -1) continue;
      const rA = Math.floor(posA / this.cols), cA = posA % this.cols;
      const rB = Math.floor(posB / this.cols), cB = posB % this.cols;
      if (Math.abs(rA - rB) + Math.abs(cA - cB) <= 1) {
        score -= 1; // penalty for being adjacent
      }
    }

    for (const [a, b] of this.constraints.keep_together_pairs) {
      const posA = chrom.indexOf(a);
      const posB = chrom.indexOf(b);
      if (posA === -1 || posB === -1) continue;
      const rA = Math.floor(posA / this.cols), cA = posA % this.cols;
      const rB = Math.floor(posB / this.cols), cB = posB % this.cols;
      const dist = Math.abs(rA - rB) + Math.abs(cA - cB);
      if (dist <= 1) {
        score += 0.5;
      }
    }

    return score;
  }

  // ── Objective breakdown ───────────────────────────────────────────────────

  private scoreObjectives(
    chrom: Chromosome,
    studentMap: Map<string, Student>,
  ): ObjectiveScores {
    let academicSum = 0;
    let behavioralSum = 0;
    let diversitySum = 0;
    let specialSum = 0;
    let count = 0;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const sid = chrom[r * this.cols + c];
        if (!sid) continue;
        const s = studentMap.get(sid);
        if (!s) continue;
        count++;

        const offsets = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        const neighbors: Student[] = [];
        for (const [dr, dc] of offsets) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
            const nid = chrom[nr * this.cols + nc];
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

  // ── Selection ─────────────────────────────────────────────────────────────

  private tournamentSelect(
    scored: { chrom: Chromosome; fitness: number }[],
  ): Chromosome {
    let best = pickRandom(scored);
    for (let i = 1; i < this.config.tournamentSize; i++) {
      const candidate = pickRandom(scored);
      if (candidate.fitness > best.fitness) best = candidate;
    }
    return [...best.chrom];
  }

  // ── Crossover (Order Crossover - OX) for permutations ─────────────────────

  private orderCrossover(parentA: Chromosome, parentB: Chromosome): Chromosome {
    const len = parentA.length;
    const start = Math.floor(Math.random() * len);
    const end = start + Math.floor(Math.random() * (len - start));

    const child: string[] = new Array(len).fill('');
    const used = new Set<string>();

    // Copy segment from parent A
    for (let i = start; i <= end && i < len; i++) {
      child[i] = parentA[i];
      if (parentA[i]) used.add(parentA[i]);
    }

    // Fill remaining from parent B (preserving order)
    let ci = (end + 1) % len;
    for (let i = 0; i < len; i++) {
      const idx = (end + 1 + i) % len;
      const gene = parentB[idx];
      if (gene === '' || !used.has(gene)) {
        // Find next empty slot in child
        while (child[ci] !== '') {
          ci = (ci + 1) % len;
        }
        child[ci] = gene;
        if (gene) used.add(gene);
      }
    }

    return child;
  }

  // ── Mutation ──────────────────────────────────────────────────────────────

  private swapMutate(chrom: Chromosome) {
    const len = chrom.length;
    const i = Math.floor(Math.random() * len);
    const j = Math.floor(Math.random() * len);
    [chrom[i], chrom[j]] = [chrom[j], chrom[i]];
  }

  // ── Build result structures ───────────────────────────────────────────────

  private buildLayout(chrom: Chromosome): ClassroomLayout {
    const seats: Seat[] = chrom.map((sid, idx) => {
      const row = Math.floor(idx / this.cols);
      const col = idx % this.cols;
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
      rows: this.rows,
      cols: this.cols,
      total_seats: this.rows * this.cols,
      seats,
    };
  }

  private buildStudentPositions(
    chrom: Chromosome,
  ): Record<string, SeatPosition> {
    const positions: Record<string, SeatPosition> = {};
    chrom.forEach((sid, idx) => {
      if (!sid) return;
      const row = Math.floor(idx / this.cols);
      const col = idx % this.cols;
      positions[sid] = {
        row,
        col,
        is_front_row: row === 0,
        is_near_teacher: row === 0,
      };
    });
    return positions;
  }
}
