/**
 * Pure TypeScript Genetic Algorithm optimizer for classroom seating.
 *
 * The optimizer is layout-agnostic: it works on a flat list of Slots and
 * a chromosome of student IDs indexed the same way. Whether the layout is
 * a rectangular grid, a U-shape, a circle, etc. is decided upstream by
 * `generateSlots(def)` — see core/layouts.ts.
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
  LayoutType,
} from '../types';
import { generateSlots, type LayoutDef, type Slot } from './layouts';

type Chromosome = string[]; // student IDs (or '' for empty) at each slot index

/** Pluggable RNG so tests can seed it for deterministic runs. Defaults
 *  to Math.random in production. */
export type Rng = () => number;

function makeShuffle(rng: Rng) {
  return <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
}

function makePickRandom(rng: Rng) {
  return <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
}

/** A small, fast, deterministic PRNG (mulberry32) — exported so tests
 *  and consumers can produce reproducible optimization runs. */
export function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export class ClassroomOptimizer {
  private students: Student[];
  private slots: Slot[];
  private layoutDef: LayoutDef;
  private rng: Rng = Math.random;
  private shuffle = makeShuffle(this.rng);
  private pickRandom = makePickRandom(this.rng);
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
  /** Rotation avoidance: canonical pair key ("idA|idB", ids sorted) →
   *  penalty weight in (0, 1] for pairs who recently sat together. Empty
   *  unless the teacher enables "freshen seating". */
  private recentPairPenalties: Record<string, number> = {};
  /** How strongly to avoid recently-adjacent pairs. 0 disables the term. */
  private avoidRecentStrength = 0;

  constructor(
    students: Student[],
    rowsOrLayout: number | LayoutDef,
    cols?: number,
  ) {
    this.students = students;
    if (typeof rowsOrLayout === 'number') {
      // Back-compat path: (students, rows, cols) → default to 'rows' layout.
      this.layoutDef = { type: 'rows', rows: rowsOrLayout, cols: cols ?? 0 };
    } else {
      this.layoutDef = rowsOrLayout;
    }
    this.slots = generateSlots(this.layoutDef);
  }

  setWeights(w: ObjectiveWeights) {
    this.weights = { ...w };
  }
  setConfig(c: GeneticConfig) {
    this.config = { ...c };
  }
  setConstraints(c: SeatingConstraints) {
    this.constraints = { ...c };
  }
  /** Enable rotation avoidance. `penalties` comes from
   *  `getRecentPairPenalties()`; `strength` scales the penalty (0 = off). */
  setRotationAvoidance(penalties: Record<string, number>, strength: number) {
    this.recentPairPenalties = penalties ?? {};
    this.avoidRecentStrength = Math.max(0, strength);
  }
  setLayout(def: LayoutDef) {
    this.layoutDef = def;
    this.slots = generateSlots(def);
  }
  /** Inject a custom RNG (e.g. a seeded PRNG for tests). Affects shuffle,
   *  tournament selection, crossover, and mutation. */
  setRng(rng: Rng) {
    this.rng = rng;
    this.shuffle = makeShuffle(rng);
    this.pickRandom = makePickRandom(rng);
  }

  // ── Main entry point ──────────────────────────────────────────────────────

  /**
   * Run the genetic algorithm one full time and return the best
   * chromosome it produced with its fitness. Pure (no class-state
   * mutation), so the multi-start wrapper can call it repeatedly.
   */
  private runSingleStart(
    ids: string[],
    studentMap: Map<string, Student>,
    totalSeats: number,
  ): { chrom: Chromosome; fitness: number } {
    // Build initial population
    let population: Chromosome[] = [];
    population.push(this.seedFromConstraints(ids, totalSeats));
    while (population.length < this.config.populationSize) {
      const chrom = this.shuffle(ids);
      while (chrom.length < totalSeats) chrom.push('');
      population.push(chrom);
    }

    let bestFitness = -Infinity;
    let bestChrom: Chromosome = population[0];
    let stagnation = 0;

    for (let gen = 0; gen < this.config.maxGenerations; gen++) {
      const scored = population.map((chrom) => ({
        chrom,
        fitness: this.fitness(chrom, studentMap),
      }));

      scored.sort((a, b) => b.fitness - a.fitness);
      if (scored[0].fitness > bestFitness) {
        bestFitness = scored[0].fitness;
        bestChrom = scored[0].chrom;
        stagnation = 0;
      } else {
        stagnation++;
      }

      if (stagnation >= this.config.earlyStopPatience) break;

      const nextGen: Chromosome[] = [scored[0].chrom]; // elitism
      while (nextGen.length < this.config.populationSize) {
        const parentA = this.tournamentSelect(scored);
        const parentB = this.tournamentSelect(scored);

        let child: Chromosome;
        if (this.rng() < this.config.crossoverRate) {
          child = this.orderCrossover(parentA, parentB);
        } else {
          child = [...parentA];
        }

        if (this.rng() < this.config.mutationRate) {
          this.swapMutate(child);
        }

        nextGen.push(child);
      }

      population = nextGen;
    }

    return { chrom: bestChrom, fitness: bestFitness };
  }

  optimize(): OptimizationResult {
    const t0 = performance.now();
    const warnings: string[] = [];

    const studentMap = new Map(this.students.map((s) => [s.id, s]));
    const totalSeats = this.slots.length;
    let ids = this.students.map((s) => s.id);

    if (ids.length > totalSeats) {
      warnings.push(
        `Too many students (${ids.length}) for ${totalSeats} seats. Extras will be omitted.`,
      );
      ids = ids.slice(0, totalSeats);
    }

    // Multi-start: run the GA `multiStart` times with fresh
    // random populations and keep the best result. The GA gets stuck
    // in local optima sometimes; an extra restart costs ~200ms per
    // start for typical classes but doubles result reliability.
    const starts = Math.max(1, Math.min(10, this.config.multiStart ?? 1));
    let best: { chrom: Chromosome; fitness: number } | null = null;
    for (let s = 0; s < starts; s++) {
      const candidate = this.runSingleStart(ids, studentMap, totalSeats);
      if (!best || candidate.fitness > best.fitness) best = candidate;
    }
    const bestChrom = best!.chrom;
    const bestFitness = best!.fitness;

    const computationTimeMs = performance.now() - t0;

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
    const frontSlots = this.slots.filter((s) => s.isFront).map((s) => s.index);
    const backSlots = this.slots.filter((s) => s.isBack).map((s) => s.index);

    for (const sid of this.constraints.front_row_ids) {
      if (!ids.includes(sid)) continue;
      for (const slotIdx of frontSlots) {
        if (chrom[slotIdx] === '') {
          chrom[slotIdx] = sid;
          placed.add(sid);
          break;
        }
      }
    }
    for (const sid of this.constraints.back_row_ids) {
      if (!ids.includes(sid) || placed.has(sid)) continue;
      for (const slotIdx of backSlots) {
        if (chrom[slotIdx] === '') {
          chrom[slotIdx] = sid;
          placed.add(sid);
          break;
        }
      }
    }

    const remaining = this.shuffle(ids.filter((id) => !placed.has(id)));
    let ri = 0;
    for (let i = 0; i < totalSeats && ri < remaining.length; i++) {
      if (chrom[i] === '') chrom[i] = remaining[ri++];
    }
    return chrom;
  }

  // ── Fitness function ──────────────────────────────────────────────────────

  private fitness(
    chrom: Chromosome,
    studentMap: Map<string, Student>,
  ): number {
    let score = 0;

    for (const slot of this.slots) {
      const sid = chrom[slot.index];
      if (!sid) continue;
      const student = studentMap.get(sid);
      if (!student) continue;

      const neighbors: Student[] = [];
      for (const nIdx of slot.neighbors) {
        const nid = chrom[nIdx];
        if (!nid) continue;
        const ns = studentMap.get(nid);
        if (ns) neighbors.push(ns);
      }
      if (neighbors.length === 0) continue;

      // Academic balance
      const avgA =
        neighbors.reduce((sum, n) => sum + n.academic_score, 0) /
        neighbors.length;
      score +=
        this.weights.academic_balance *
        (1 - Math.abs(student.academic_score - avgA) / 100);

      // Behavioral balance
      const avgB =
        neighbors.reduce((sum, n) => sum + n.behavior_score, 0) /
        neighbors.length;
      score +=
        this.weights.behavioral_balance *
        (1 - Math.abs(student.behavior_score - avgB) / 100);

      // Diversity (gender mix)
      const sameG = neighbors.filter((n) => n.gender === student.gender).length;
      score +=
        this.weights.diversity * (1 - sameG / neighbors.length);

      // Front-row need
      if (student.requires_front_row || student.has_mobility_issues) {
        score +=
          this.weights.special_needs * (slot.isFront ? 1 : -0.5);
      }

      // Quiet area: prefer perimeter (front, back, or edge cols)
      if (student.requires_quiet_area) {
        // Treat slots near the edge of normalized space as "edge"
        const isEdge =
          slot.x <= 0.05 || slot.x >= 0.95 || slot.isFront || slot.isBack;
        score += this.weights.special_needs * (isEdge ? 0.5 : 0);
      }

      // Friend bonus
      if (student.friends_ids.length > 0) {
        const friendCount = neighbors.filter((n) =>
          student.friends_ids.includes(n.id),
        ).length;
        score += 0.1 * friendCount;
      }

      // Incompatible adjacency penalty
      if (neighbors.some((n) => student.incompatible_ids.includes(n.id))) {
        score -= 0.5;
      }

      // Rotation avoidance — discourage seating a pair next to each other
      // again if they recently were. Counted once per unordered pair
      // (student.id < neighbor.id) to match how the penalty table is built.
      if (this.avoidRecentStrength > 0) {
        for (const n of neighbors) {
          if (student.id >= n.id) continue;
          const p = this.recentPairPenalties[`${student.id}|${n.id}`];
          if (p) score -= this.avoidRecentStrength * p;
        }
      }
    }

    // Pair-based constraints
    for (const [a, b] of this.constraints.separate_pairs) {
      const sa = chrom.indexOf(a);
      const sb = chrom.indexOf(b);
      if (sa === -1 || sb === -1) continue;
      if (this.slots[sa].neighbors.includes(sb)) score -= 1;
    }
    for (const [a, b] of this.constraints.keep_together_pairs) {
      const sa = chrom.indexOf(a);
      const sb = chrom.indexOf(b);
      if (sa === -1 || sb === -1) continue;
      if (this.slots[sa].neighbors.includes(sb)) score += 0.5;
    }

    // Front/back row assignments
    for (const id of this.constraints.front_row_ids) {
      const pos = chrom.indexOf(id);
      if (pos === -1) continue;
      const slot = this.slots[pos];
      if (slot.isFront) score += 1;
      else score -= 0.5 * slot.row;
    }
    for (const id of this.constraints.back_row_ids) {
      const pos = chrom.indexOf(id);
      if (pos === -1) continue;
      const slot = this.slots[pos];
      if (slot.isBack) score += 1;
      else {
        const maxRow = Math.max(...this.slots.map((s) => s.row));
        score -= 0.5 * (maxRow - slot.row);
      }
    }

    // Aisle assignments — reward edge-column placement.
    // Anyone in the leftmost or rightmost ~5% of normalized x is "on the aisle".
    for (const id of this.constraints.aisle_ids ?? []) {
      const pos = chrom.indexOf(id);
      if (pos === -1) continue;
      const slot = this.slots[pos];
      const onAisle = slot.x <= 0.05 || slot.x >= 0.95;
      if (onAisle) score += 1;
      else score -= 0.5 * Math.min(slot.x, 1 - slot.x);
    }

    // Near-window assignments — reward left-column placement.
    // (UI presents this as "window side". Mirror with `aisle` if you need the
    // other wall.)
    for (const id of this.constraints.near_window_ids ?? []) {
      const pos = chrom.indexOf(id);
      if (pos === -1) continue;
      const slot = this.slots[pos];
      if (slot.x <= 0.1) score += 1;
      else score -= 0.4 * slot.x;
    }

    // Peer mentor → mentee adjacency. Both must be adjacent; if they are,
    // reward strongly so mentor pairs reliably sit together.
    for (const [mentor, mentee] of this.constraints.peer_mentor_pairs ?? []) {
      const sa = chrom.indexOf(mentor);
      const sb = chrom.indexOf(mentee);
      if (sa === -1 || sb === -1) continue;
      if (this.slots[sa].neighbors.includes(sb)) score += 0.75;
      else score -= 0.25;
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

    for (const slot of this.slots) {
      const sid = chrom[slot.index];
      if (!sid) continue;
      const s = studentMap.get(sid);
      if (!s) continue;
      count++;

      const neighbors: Student[] = [];
      for (const nIdx of slot.neighbors) {
        const nid = chrom[nIdx];
        if (!nid) continue;
        const ns = studentMap.get(nid);
        if (ns) neighbors.push(ns);
      }
      if (neighbors.length === 0) continue;

      const avgA =
        neighbors.reduce((sum, n) => sum + n.academic_score, 0) /
        neighbors.length;
      academicSum += 1 - Math.abs(s.academic_score - avgA) / 100;

      const avgB =
        neighbors.reduce((sum, n) => sum + n.behavior_score, 0) /
        neighbors.length;
      behavioralSum += 1 - Math.abs(s.behavior_score - avgB) / 100;

      const sameG = neighbors.filter((n) => n.gender === s.gender).length;
      diversitySum += 1 - sameG / neighbors.length;

      if (s.requires_front_row || s.has_mobility_issues) {
        specialSum += slot.isFront ? 1 : 0;
      }
    }

    return {
      academic_balance:
        count > 0 ? Math.round((academicSum / count) * 100) : 0,
      behavioral_balance:
        count > 0 ? Math.round((behavioralSum / count) * 100) : 0,
      diversity: count > 0 ? Math.round((diversitySum / count) * 100) : 0,
      special_needs: count > 0 ? Math.round((specialSum / count) * 100) : 0,
    };
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  private tournamentSelect(
    scored: { chrom: Chromosome; fitness: number }[],
  ): Chromosome {
    let best = this.pickRandom(scored);
    for (let i = 1; i < this.config.tournamentSize; i++) {
      const cand = this.pickRandom(scored);
      if (cand.fitness > best.fitness) best = cand;
    }
    return [...best.chrom];
  }

  // ── Crossover (Order Crossover - OX) ──────────────────────────────────────

  private orderCrossover(
    parentA: Chromosome,
    parentB: Chromosome,
  ): Chromosome {
    const len = parentA.length;
    const start = Math.floor(this.rng() * len);
    const end = start + Math.floor(this.rng() * (len - start));

    const child: string[] = new Array(len).fill('');
    const used = new Set<string>();

    for (let i = start; i <= end && i < len; i++) {
      child[i] = parentA[i];
      if (parentA[i]) used.add(parentA[i]);
    }

    let ci = (end + 1) % len;
    for (let i = 0; i < len; i++) {
      const idx = (end + 1 + i) % len;
      const gene = parentB[idx];
      if (gene === '' || !used.has(gene)) {
        while (child[ci] !== '') ci = (ci + 1) % len;
        child[ci] = gene;
        if (gene) used.add(gene);
      }
    }
    return child;
  }

  // ── Mutation ──────────────────────────────────────────────────────────────

  private swapMutate(chrom: Chromosome) {
    const len = chrom.length;
    const i = Math.floor(this.rng() * len);
    const j = Math.floor(this.rng() * len);
    [chrom[i], chrom[j]] = [chrom[j], chrom[i]];
  }

  // ── Build result structures ───────────────────────────────────────────────

  private buildLayout(chrom: Chromosome): ClassroomLayout {
    const seats: Seat[] = this.slots.map((slot) => {
      const sid = chrom[slot.index];
      return {
        position: this.slotToPosition(slot),
        student_id: sid || undefined,
        is_empty: !sid,
      };
    });

    // For non-grid layouts we still want `rows`/`cols` populated for
    // back-compat with renderers that read them. Use the maximum logical
    // values so e.g. constraint UI still sees a sensible "rows" count.
    const maxRow = this.slots.reduce((m, s) => Math.max(m, s.row), 0);
    const maxCol = this.slots.reduce((m, s) => Math.max(m, s.col), 0);

    return {
      layout_type: this.layoutDef.type as LayoutType,
      rows: maxRow + 1,
      cols: maxCol + 1,
      total_seats: this.slots.length,
      seats,
    };
  }

  private buildStudentPositions(
    chrom: Chromosome,
  ): Record<string, SeatPosition> {
    const positions: Record<string, SeatPosition> = {};
    for (const slot of this.slots) {
      const sid = chrom[slot.index];
      if (!sid) continue;
      positions[sid] = this.slotToPosition(slot);
    }
    return positions;
  }

  private slotToPosition(slot: Slot): SeatPosition {
    return {
      row: slot.row,
      col: slot.col,
      is_front_row: slot.isFront,
      is_near_teacher: slot.isFront,
      x: slot.x,
      y: slot.y,
    };
  }
}
