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

/** A chromosome paired with its (cached) fitness. Individuals are scored
 *  exactly once — when created — and carry the score with them so elites
 *  surviving into the next generation are never re-evaluated. */
type Scored = { chrom: Chromosome; fitness: number };

/** Why a GA start stopped. Superset of the public
 *  `OptimizationResult['stop_reason']` union: 'cancelled' (caller asked us
 *  to stop via `shouldStop`) is new here and would ideally be added to the
 *  shared type in types/global.d.ts. */
type StopReason = 'generations' | 'converged' | 'time' | 'cancelled';

/** Live progress snapshot reported during a run via `onProgress`. */
export interface OptimizeProgress {
  /** Generations completed so far, summed across multi-starts. */
  generation: number;
  /** Upper bound on generations (maxGenerations × number of starts). */
  totalGenerations: number;
  /** Best fitness found so far across all starts. */
  bestFitness: number;
}

/** Optional hooks for long-running optimizations. */
export interface OptimizeOptions {
  /** Called at most every ~10 generations, plus once at the very end. */
  onProgress?: (p: OptimizeProgress) => void;
  /** Polled once per generation; return true to stop early. The best
   *  result found so far is still returned (stop_reason 'cancelled'). */
  shouldStop?: () => boolean;
}

/** GeneticConfig plus optimizer-only extras. `seed` enables reproducible
 *  runs without widening the shared GeneticConfig type — it rides along
 *  as an extra property through the store and worker untouched. */
export type OptimizerConfig = GeneticConfig & {
  /** Optional PRNG seed. When set, the run uses mulberry32(seed) so the
   *  same inputs always produce the same seating chart. */
  seed?: number;
};

/** Penalty scale applied when "freshen seating" (rotation avoidance) is on.
 *  Tuned to be comparable to a single objective term (~0.3) so it nudges
 *  rotation without overriding hard constraints (which use ±1). Shared by
 *  the optimizer hook and the compare panel so both runs behave identically. */
export const ROTATION_STRENGTH = 0.35;

/** Exam / anti-cheating mode tuning. Each occupied neighbour costs
 *  EXAM_SPACING (so the GA leaves empty buffer seats and spreads the
 *  class out), a same-ability neighbour adds EXAM_SAME_LEVEL (similar
 *  students are the easiest to copy from), and an adjacent friend adds
 *  EXAM_FRIEND. Tuned to dominate the soft balance terms they replace. */
export const EXAM_SPACING = 0.5;
export const EXAM_SAME_LEVEL = 0.4;
export const EXAM_FRIEND = 0.6;

/** Penalty applied per violated **hard** (required) rule. Set far above the
 *  objective + soft-constraint scale (which lives in the single digits) so the
 *  GA treats hard rules as effectively inviolable — it will only leave one
 *  unmet when the hard rules are contradictory or physically impossible. */
export const HARD_PENALTY = 1000;

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
  /** Exam / anti-cheating mode — see EXAM_* constants. */
  private examMode = false;
  /** Locked seats: slotIndex → studentId. Those students stay put; the GA
   *  only rearranges the rest among the unpinned slots. Empty when nothing
   *  is locked — in which case every pinned-aware operation below reduces to
   *  its original full-chromosome behaviour, so seeded runs stay bit-for-bit
   *  reproducible. */
  private pinned = new Map<number, string>();
  /** Slot indices the GA is free to fill, ascending. Recomputed per run from
   *  `pinned`; defaults to every slot. */
  private freeSlots: number[] = [];
  /** Min/max normalized x across the current slots. "Aisle" / "window" are
   *  defined relative to these actual extremes rather than absolute 0/1, so
   *  the constraints stay satisfiable in layouts whose seats don't span the
   *  full width (e.g. a circle, whose x is bounded to ~[0.08, 0.92]). */
  private xMin = 0;
  private xMax = 1;

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
    this.recomputeSlotBounds();
  }

  /** Refresh the cached x-extent whenever the slot set changes. */
  private recomputeSlotBounds() {
    if (this.slots.length === 0) {
      this.xMin = 0;
      this.xMax = 1;
      return;
    }
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of this.slots) {
      if (s.x < lo) lo = s.x;
      if (s.x > hi) hi = s.x;
    }
    this.xMin = lo;
    this.xMax = hi;
  }

  /** Margin (in normalized x) within which a seat counts as being on the
   *  aisle / window wall. Scaled to the layout's width so it means "the
   *  outermost seats" regardless of how wide the layout actually is. */
  private edgeMargin(): number {
    return Math.max(0.02, (this.xMax - this.xMin) * 0.06);
  }
  /** True when the seat is against either side wall (aisle). */
  private isAisleSlot(slot: Slot): boolean {
    const m = this.edgeMargin();
    return slot.x <= this.xMin + m || slot.x >= this.xMax - m;
  }
  /** True when the seat is against the window (left) wall. */
  private isWindowSlot(slot: Slot): boolean {
    return slot.x <= this.xMin + this.edgeMargin();
  }

  setWeights(w: ObjectiveWeights) {
    this.weights = { ...w };
  }
  setConfig(c: OptimizerConfig) {
    this.config = { ...c };
    this.examMode = !!c.examMode;
    // Seeded reproducible runs: a numeric seed swaps in a deterministic
    // PRNG. Absent seed leaves the current RNG untouched (Math.random by
    // default, or whatever a prior setRng() installed).
    if (typeof c.seed === 'number') this.setRng(mulberry32(c.seed));
  }
  /** Toggle exam / anti-cheating mode directly (config also carries it). */
  setExamMode(on: boolean) {
    this.examMode = on;
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
    this.recomputeSlotBounds();
  }
  /** Pin students to seats so a re-optimize keeps them in place and only
   *  rearranges the rest. `pinned` maps slotIndex → studentId; entries whose
   *  slot or student is out of range are ignored. Pass an empty map (or omit)
   *  to optimize everything freely. */
  setPinned(pinned: Map<number, string>) {
    const valid = new Map<number, string>();
    const ids = new Set(this.students.map((s) => s.id));
    // Also dedupe by student: pinning the same id to two slots would write
    // that student twice into the chromosome (a duplicate gene) and drop
    // someone else. First pin wins.
    const pinnedIds = new Set<string>();
    for (const [slotIdx, sid] of pinned) {
      if (slotIdx >= 0 && slotIdx < this.slots.length && ids.has(sid) && !pinnedIds.has(sid)) {
        valid.set(slotIdx, sid);
        pinnedIds.add(sid);
      }
    }
    this.pinned = valid;
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
   *
   * Implemented as a generator that yields once per completed generation
   * so the drivers (`optimize` / `optimizeAsync`) can stream progress and
   * — in the async case — periodically yield the event loop to let a
   * hosting worker receive cancel messages.
   */
  private *runSingleStartGen(
    ids: string[],
    studentMap: Map<string, Student>,
    totalSeats: number,
    deadline: number | null,
    shouldStop?: () => boolean,
  ): Generator<
    { generation: number; bestFitness: number },
    {
      chrom: Chromosome;
      fitness: number;
      generations: number;
      stopReason: StopReason;
    },
    void
  > {
    // Build the initial population, scoring each individual exactly once.
    // From here on, fitness travels with the chromosome: children are
    // scored when created and the elite keeps its cached score, so the
    // population is never re-scored wholesale.
    const seeded = this.seedFromConstraints(ids, totalSeats);
    let scored: Scored[] = [
      { chrom: seeded, fitness: this.fitness(seeded, studentMap) },
    ];
    while (scored.length < this.config.populationSize) {
      const chrom = this.seedRandom(ids, totalSeats);
      scored.push({ chrom, fitness: this.fitness(chrom, studentMap) });
    }

    let bestFitness = -Infinity;
    let bestChrom: Chromosome = scored[0].chrom;
    let stagnation = 0;
    // Generations actually executed and the reason we stopped. Default to
    // hitting the configured cap; overwritten if we bail early.
    let generations = 0;
    let stopReason: StopReason = 'generations';

    for (let gen = 0; gen < this.config.maxGenerations; gen++) {
      generations = gen + 1;

      scored.sort((a, b) => b.fitness - a.fitness);
      if (scored[0].fitness > bestFitness) {
        bestFitness = scored[0].fitness;
        bestChrom = scored[0].chrom;
        stagnation = 0;
      } else {
        stagnation++;
      }

      // Let the driver observe progress (and, in the async path, yield the
      // event loop) once per generation.
      yield { generation: generations, bestFitness };

      if (stagnation >= this.config.earlyStopPatience) {
        stopReason = 'converged';
        break;
      }
      // Wall-clock budget — stop mid-search and return the best so far.
      if (deadline !== null && performance.now() >= deadline) {
        stopReason = 'time';
        break;
      }
      // Caller-requested cancellation — keep the best found so far.
      if (shouldStop?.()) {
        stopReason = 'cancelled';
        break;
      }

      const nextGen: Scored[] = [scored[0]]; // elitism — keeps cached score
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

        nextGen.push({ chrom: child, fitness: this.fitness(child, studentMap) });
      }

      scored = nextGen;
    }

    // The loop updates bestChrom at the *top* of each iteration, so any
    // improvement bred in the final generation would otherwise be discarded
    // (only the carried-over elite survives). Do one last compare here.
    scored.sort((a, b) => b.fitness - a.fitness);
    if (scored[0].fitness > bestFitness) {
      bestFitness = scored[0].fitness;
      bestChrom = scored[0].chrom;
    }

    return { chrom: bestChrom, fitness: bestFitness, generations, stopReason };
  }

  optimize(opts?: OptimizeOptions): OptimizationResult {
    // Synchronous driver: drain the generator in one go. Existing callers
    // see exactly the old blocking behaviour (and result shape).
    const it = this.optimizeGen(opts);
    let step = it.next();
    while (!step.done) step = it.next();
    return step.value;
  }

  /**
   * Async variant of `optimize()` for workers: runs `chunkGenerations`
   * generations at a time, then awaits a macrotask (`setTimeout 0`) so the
   * hosting worker's message queue can deliver a 'cancel' (consumed via
   * `opts.shouldStop`). Same result shape as `optimize()`.
   */
  async optimizeAsync(
    opts?: OptimizeOptions & { chunkGenerations?: number },
  ): Promise<OptimizationResult> {
    const chunk = Math.max(1, opts?.chunkGenerations ?? 20);
    const it = this.optimizeGen(opts);
    let sinceYield = 0;
    let step = it.next();
    while (!step.done) {
      if (++sinceYield >= chunk) {
        sinceYield = 0;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      step = it.next();
    }
    return step.value;
  }

  /**
   * Shared optimization pipeline (multi-start GA + local-search polish),
   * written as a generator that yields once per completed generation. The
   * sync and async entry points above just drive it at different paces.
   */
  private *optimizeGen(
    opts?: OptimizeOptions,
  ): Generator<void, OptimizationResult, void> {
    const t0 = performance.now();
    const warnings: string[] = [];

    const studentMap = new Map(this.students.map((s) => [s.id, s]));
    const totalSeats = this.slots.length;

    // Pinned students are already seated and never moved or dropped; the GA
    // pool is everyone else, arranged among the unpinned slots. With nothing
    // pinned, freeSlots is every slot and `ids` is the whole roster — i.e.
    // the original behaviour, so seeded runs stay reproducible.
    this.freeSlots = this.slots.map((s) => s.index).filter((i) => !this.pinned.has(i));
    const pinnedIds = new Set(this.pinned.values());
    let ids = this.students.map((s) => s.id).filter((id) => !pinnedIds.has(id));

    if (ids.length > this.freeSlots.length) {
      const totalStudents = ids.length + pinnedIds.size;
      warnings.push(
        `Too many students (${totalStudents}) for ${totalSeats} seats. Extras will be omitted.`,
      );
      ids = ids.slice(0, this.freeSlots.length);
    }

    // Optional wall-clock budget shared across all starts. When set, no
    // new generation runs once the deadline passes; whatever we've found
    // so far is returned. A guaranteed minimum of one start always runs.
    const deadline =
      this.config.timeLimitMs && this.config.timeLimitMs > 0
        ? t0 + this.config.timeLimitMs
        : null;

    // Multi-start: run the GA `multiStart` times with fresh
    // random populations and keep the best result. The GA gets stuck
    // in local optima sometimes; an extra restart costs ~200ms per
    // start for typical classes but doubles result reliability.
    const starts = Math.max(1, Math.min(10, this.config.multiStart ?? 1));
    const totalGenerations = this.config.maxGenerations * starts;
    const onProgress = opts?.onProgress;
    // Progress is throttled here (not per-generation) so listeners see at
    // most one report every ~10 generations plus a final one.
    let globalBest = -Infinity;
    let lastGlobalGen = 0;
    let lastReportedGen = -Infinity;
    let best: {
      chrom: Chromosome;
      fitness: number;
      generations: number;
      stopReason: StopReason;
    } | null = null;

    for (let s = 0; s < starts; s++) {
      // Always run the first start; skip later starts once out of time
      // or once the caller has asked us to stop.
      if (s > 0 && deadline !== null && performance.now() >= deadline) break;
      if (s > 0 && opts?.shouldStop?.()) break;

      const start = this.runSingleStartGen(
        ids,
        studentMap,
        totalSeats,
        deadline,
        opts?.shouldStop,
      );
      let step = start.next();
      while (!step.done) {
        const { generation, bestFitness } = step.value;
        lastGlobalGen = s * this.config.maxGenerations + generation;
        if (bestFitness > globalBest) globalBest = bestFitness;
        if (onProgress && lastGlobalGen - lastReportedGen >= 10) {
          lastReportedGen = lastGlobalGen;
          onProgress({
            generation: lastGlobalGen,
            totalGenerations,
            bestFitness: globalBest,
          });
        }
        yield; // chunking point for optimizeAsync
        step = start.next();
      }

      const candidate = step.value;
      if (!best || candidate.fitness > best.fitness) best = candidate;
      if (candidate.stopReason === 'cancelled') break;
    }

    // Memetic polish: hill-climb the GA's best chromosome with pairwise
    // swaps. Only ever improves (or keeps) the fitness.
    const polished = this.localSearchPolish(best!.chrom, studentMap);
    const bestChrom = polished.chrom;
    const bestFitness = polished.fitness;

    // Final progress report so listeners always see the finished state.
    if (onProgress) {
      onProgress({
        generation: lastGlobalGen,
        totalGenerations,
        bestFitness: Math.max(globalBest, bestFitness),
      });
    }

    const computationTimeMs = performance.now() - t0;

    const layout = this.buildLayout(bestChrom);
    const studentPositions = this.buildStudentPositions(bestChrom);
    const objectiveScores = this.scoreObjectives(bestChrom, studentMap);

    // Any hard rule still unmet means the required rules were contradictory or
    // impossible. Reported via the dedicated `unmet_hard_rules` field so the UI
    // can show a localized message (rather than an English warning string).
    const unmetHard = this.countHardViolations(bestChrom);

    return {
      layout,
      student_positions: studentPositions,
      fitness_score: bestFitness,
      objective_scores: objectiveScores,
      unmet_hard_rules: unmetHard || undefined,
      // Report the real work done by the winning start, not the configured
      // cap — so the UI can say "converged after N generations" honestly.
      generations: best!.generations,
      // 'cancelled' is internal-only for now: the shared OptimizationResult
      // type in types/global.d.ts doesn't include it yet (would need the
      // union widened + an `optimization.stop_cancelled` locale string).
      stop_reason: best!.stopReason as OptimizationResult['stop_reason'],
      computation_time_ms: computationTimeMs,
      warnings,
      algorithm: 'genetic',
    };
  }

  // ── Local-search polish (memetic step) ────────────────────────────────────

  /**
   * Hill-climb a chromosome by trying pairwise position swaps (including
   * into empty slots) and keeping any swap that improves fitness. Repeats
   * passes until a pass yields no improvement, up to `maxPasses` passes or
   * `maxEvals` fitness evaluations — whichever comes first — so the cost
   * stays bounded even for large rooms.
   */
  private localSearchPolish(
    chrom: Chromosome,
    studentMap: Map<string, Student>,
    maxPasses = 3,
    maxEvals = 2000,
  ): { chrom: Chromosome; fitness: number } {
    const best = [...chrom];
    let bestFitness = this.fitness(best, studentMap);
    let evals = 0;
    // Only consider swaps between free positions — pinned seats stay put.
    // With nothing pinned, F is every index so this enumerates every pair.
    const F = this.freeSlots;

    for (let pass = 0; pass < maxPasses && evals < maxEvals; pass++) {
      let improved = false;
      for (let a = 0; a < F.length - 1 && evals < maxEvals; a++) {
        for (let b = a + 1; b < F.length && evals < maxEvals; b++) {
          const i = F[a];
          const j = F[b];
          // Swapping two empty seats (or identical genes) is a no-op.
          if (best[i] === best[j]) continue;
          [best[i], best[j]] = [best[j], best[i]];
          evals++;
          const f = this.fitness(best, studentMap);
          if (f > bestFitness) {
            bestFitness = f;
            improved = true;
          } else {
            [best[i], best[j]] = [best[j], best[i]]; // revert
          }
        }
      }
      if (!improved) break;
    }

    return { chrom: best, fitness: bestFitness };
  }

  // ── Constraint-aware seeding ──────────────────────────────────────────────

  private seedFromConstraints(ids: string[], totalSeats: number): Chromosome {
    const chrom: Chromosome = new Array(totalSeats).fill('');
    const placed = new Set<string>();
    // Pinned students are placed first — an explicit lock outranks the soft
    // front/back row preferences below.
    for (const [slotIdx, sid] of this.pinned) {
      chrom[slotIdx] = sid;
      placed.add(sid);
    }
    // Only unpinned slots are available to the constraint/random seeding.
    const frontSlots = this.slots
      .filter((s) => s.isFront && !this.pinned.has(s.index))
      .map((s) => s.index);
    const backSlots = this.slots
      .filter((s) => s.isBack && !this.pinned.has(s.index))
      .map((s) => s.index);

    for (const sid of this.constraints.front_row_ids) {
      if (!ids.includes(sid) || placed.has(sid)) continue;
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
    for (const i of this.freeSlots) {
      if (ri >= remaining.length) break;
      if (chrom[i] === '') chrom[i] = remaining[ri++];
    }
    return chrom;
  }

  /** Build one random member of the initial population: pinned genes fixed,
   *  the rest of the roster shuffled into the free slots. With nothing pinned
   *  this is exactly `shuffle(ids)` padded with empties (same RNG draw). */
  private seedRandom(ids: string[], totalSeats: number): Chromosome {
    const chrom: Chromosome = new Array(totalSeats).fill('');
    for (const [slotIdx, sid] of this.pinned) chrom[slotIdx] = sid;
    const shuffled = this.shuffle(ids);
    const F = this.freeSlots;
    for (let k = 0; k < shuffled.length && k < F.length; k++) {
      chrom[F[k]] = shuffled[k];
    }
    return chrom;
  }

  // ── Hard (required) rules ─────────────────────────────────────────────────

  private isHard(cat: import('../types').HardRuleCategory): boolean {
    return !!this.constraints.hard?.[cat];
  }

  /**
   * Count how many **hard** rule instances a chromosome violates. Only
   * categories the teacher marked required are checked. A rule referencing a
   * student who isn't placed is skipped (it can't be the chart's fault). Used
   * both to penalise violations during the search (× HARD_PENALTY) and to
   * report the unmet count on the final chart.
   */
  private countHardViolations(
    chrom: Chromosome,
    posOf?: Map<string, number>,
  ): number {
    const c = this.constraints;
    if (!c.hard) return 0;

    const pos =
      posOf ??
      (() => {
        const m = new Map<string, number>();
        for (let i = 0; i < chrom.length; i++) {
          const id = chrom[i];
          if (id && !m.has(id)) m.set(id, i);
        }
        return m;
      })();

    // Returns true/false for "a and b are adjacent", or null if either is
    // unplaced (skip — not the chart's fault).
    const adjacent = (a: string, b: string): boolean | null => {
      const sa = pos.get(a) ?? -1;
      const sb = pos.get(b) ?? -1;
      if (sa === -1 || sb === -1) return null;
      return this.slots[sa].neighbors.includes(sb);
    };
    const slotOf = (id: string): Slot | null => {
      const p = pos.get(id) ?? -1;
      return p === -1 ? null : this.slots[p];
    };

    let v = 0;
    if (this.isHard('separate_pairs')) {
      for (const [a, b] of c.separate_pairs) if (adjacent(a, b) === true) v++;
    }
    if (this.isHard('keep_together_pairs')) {
      for (const [a, b] of c.keep_together_pairs) if (adjacent(a, b) === false) v++;
    }
    if (this.isHard('peer_mentor_pairs')) {
      for (const [a, b] of c.peer_mentor_pairs ?? []) if (adjacent(a, b) === false) v++;
    }
    if (this.isHard('front_row_ids')) {
      for (const id of c.front_row_ids) {
        const s = slotOf(id);
        if (s && !s.isFront) v++;
      }
    }
    if (this.isHard('back_row_ids')) {
      for (const id of c.back_row_ids) {
        const s = slotOf(id);
        if (s && !s.isBack) v++;
      }
    }
    if (this.isHard('aisle_ids')) {
      for (const id of c.aisle_ids ?? []) {
        const s = slotOf(id);
        if (s && !this.isAisleSlot(s)) v++;
      }
    }
    if (this.isHard('near_window_ids')) {
      for (const id of c.near_window_ids ?? []) {
        const s = slotOf(id);
        if (s && !this.isWindowSlot(s)) v++;
      }
    }
    return v;
  }

  // ── Fitness function ──────────────────────────────────────────────────────

  private fitness(
    chrom: Chromosome,
    studentMap: Map<string, Student>,
  ): number {
    let score = 0;

    // Position lookup: studentId → chromosome index. Built once per call so the
    // constraint scoring below is O(1) per id instead of an O(seats) indexOf in
    // a loop that runs for every individual, every generation. IDs are unique
    // within a valid chromosome, so the first (and only) occurrence wins.
    const posOf = new Map<string, number>();
    for (let i = 0; i < chrom.length; i++) {
      const id = chrom[i];
      if (id && !posOf.has(id)) posOf.set(id, i);
    }

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

      // Exam / anti-cheating mode replaces the social-balance objectives:
      // we want students spread apart, not clustered by ability. Handled
      // before the "no neighbours" short-circuit because an isolated seat
      // is the ideal outcome here, not a no-op.
      if (this.examMode) {
        // Every occupied neighbour is a copying opportunity — penalise it
        // so the GA leaves empty buffer seats and disperses the class.
        score -= EXAM_SPACING * neighbors.length;
        for (const n of neighbors) {
          // Similar-ability neighbours are the easiest to copy from.
          if (n.academic_level === student.academic_level) score -= EXAM_SAME_LEVEL;
          // Friends and known-incompatible pairs must not sit together.
          if (student.friends_ids.includes(n.id)) score -= EXAM_FRIEND;
          if (student.incompatible_ids.includes(n.id)) score -= 0.5;
        }
        // Accessibility still matters during exams — keep front-row / mobility.
        if (student.requires_front_row || student.has_mobility_issues) {
          score += this.weights.special_needs * (slot.isFront ? 1 : -0.5);
        }
        continue;
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
        // Treat slots against a side wall or the front/back rows as "edge"
        const isEdge = this.isAisleSlot(slot) || slot.isFront || slot.isBack;
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
      const sa = posOf.get(a) ?? -1;
      const sb = posOf.get(b) ?? -1;
      if (sa === -1 || sb === -1) continue;
      if (this.slots[sa].neighbors.includes(sb)) score -= 1;
    }
    for (const [a, b] of this.constraints.keep_together_pairs) {
      const sa = posOf.get(a) ?? -1;
      const sb = posOf.get(b) ?? -1;
      if (sa === -1 || sb === -1) continue;
      if (this.slots[sa].neighbors.includes(sb)) score += 0.5;
    }

    // Front/back row assignments
    for (const id of this.constraints.front_row_ids) {
      const pos = posOf.get(id) ?? -1;
      if (pos === -1) continue;
      const slot = this.slots[pos];
      if (slot.isFront) score += 1;
      else score -= 0.5 * slot.row;
    }
    if (this.constraints.back_row_ids.length > 0) {
      const maxRow = Math.max(...this.slots.map((s) => s.row));
      for (const id of this.constraints.back_row_ids) {
        const pos = posOf.get(id) ?? -1;
        if (pos === -1) continue;
        const slot = this.slots[pos];
        if (slot.isBack) score += 1;
        else score -= 0.5 * (maxRow - slot.row);
      }
    }

    // Aisle assignments — reward edge-column placement.
    // Anyone in the leftmost or rightmost ~5% of normalized x is "on the aisle".
    for (const id of this.constraints.aisle_ids ?? []) {
      const pos = posOf.get(id) ?? -1;
      if (pos === -1) continue;
      const slot = this.slots[pos];
      if (this.isAisleSlot(slot)) score += 1;
      else score -= 0.5 * Math.min(slot.x - this.xMin, this.xMax - slot.x);
    }

    // Near-window assignments — reward left-column placement.
    // (UI presents this as "window side". Mirror with `aisle` if you need the
    // other wall.)
    for (const id of this.constraints.near_window_ids ?? []) {
      const pos = posOf.get(id) ?? -1;
      if (pos === -1) continue;
      const slot = this.slots[pos];
      if (this.isWindowSlot(slot)) score += 1;
      else score -= 0.4 * (slot.x - this.xMin);
    }

    // Peer mentor → mentee adjacency. Both must be adjacent; if they are,
    // reward strongly so mentor pairs reliably sit together.
    for (const [mentor, mentee] of this.constraints.peer_mentor_pairs ?? []) {
      const sa = posOf.get(mentor) ?? -1;
      const sb = posOf.get(mentee) ?? -1;
      if (sa === -1 || sb === -1) continue;
      if (this.slots[sa].neighbors.includes(sb)) score += 0.75;
      else score -= 0.25;
    }

    // Hard (required) rules: each unmet one costs HARD_PENALTY, far above the
    // soft scale above, so the GA satisfies them whenever it's possible. The
    // soft reward/penalty for the same rule still applies — it just becomes
    // a tie-breaker once the hard penalty is (or isn't) in play. No-op when
    // the teacher hasn't marked any rule required.
    if (this.constraints.hard) {
      score -= this.countHardViolations(chrom, posOf) * HARD_PENALTY;
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
    // The balance/diversity objectives only mean something for a seat that
    // has at least one neighbour, so they're averaged over `count` (seated
    // students with neighbours). The special-needs objective is different:
    // it's about the seat's row, not who's beside the student, so it's
    // averaged over its own denominator — the students who actually carry a
    // special-needs flag. Dividing it by the whole class (the old bug) meant
    // a class with a handful of correctly-placed front-row students reported
    // a near-zero special_needs score, dragging down the headline average.
    let specialSum = 0;
    let specialCount = 0;
    let count = 0;

    for (const slot of this.slots) {
      const sid = chrom[slot.index];
      if (!sid) continue;
      const s = studentMap.get(sid);
      if (!s) continue;

      // Special-needs objective — independent of neighbours, so counted for
      // every placed student who needs the front row (even an isolated one).
      if (s.requires_front_row || s.has_mobility_issues) {
        specialCount++;
        if (slot.isFront) specialSum++;
      }

      const neighbors: Student[] = [];
      for (const nIdx of slot.neighbors) {
        const nid = chrom[nIdx];
        if (!nid) continue;
        const ns = studentMap.get(nid);
        if (ns) neighbors.push(ns);
      }
      if (neighbors.length === 0) continue;
      count++;

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
    }

    return {
      academic_balance:
        count > 0 ? Math.round((academicSum / count) * 100) : 0,
      behavioral_balance:
        count > 0 ? Math.round((behavioralSum / count) * 100) : 0,
      diversity: count > 0 ? Math.round((diversitySum / count) * 100) : 0,
      // No special-needs students → the objective is vacuously satisfied
      // (100), so it neither rewards nor penalises the headline average.
      special_needs:
        specialCount > 0 ? Math.round((specialSum / specialCount) * 100) : 100,
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

  // OX runs over the *free* slot positions only: pinned genes are copied
  // straight into the child and never recombine. With nothing pinned,
  // `freeSlots` is every index in order, so this is identical (same RNG
  // draws, same writes) to a plain full-chromosome OX.
  private orderCrossover(
    parentA: Chromosome,
    parentB: Chromosome,
  ): Chromosome {
    const child: string[] = new Array(parentA.length).fill('');
    for (const [slotIdx, sid] of this.pinned) child[slotIdx] = sid;

    const F = this.freeSlots;
    const m = F.length;
    if (m === 0) return child;

    const start = Math.floor(this.rng() * m);
    const end = start + Math.floor(this.rng() * (m - start));
    const used = new Set<string>();

    for (let k = start; k <= end && k < m; k++) {
      const gene = parentA[F[k]];
      child[F[k]] = gene;
      if (gene) used.add(gene);
    }

    let ck = (end + 1) % m;
    for (let k = 0; k < m; k++) {
      const idx = (end + 1 + k) % m;
      const gene = parentB[F[idx]];
      if (gene === '' || !used.has(gene)) {
        while (child[F[ck]] !== '') ck = (ck + 1) % m;
        child[F[ck]] = gene;
        if (gene) used.add(gene);
      }
    }
    return child;
  }

  // ── Mutation ──────────────────────────────────────────────────────────────

  // Swap two free positions only — a pinned seat is never disturbed. With
  // nothing pinned this is the original full-chromosome swap.
  private swapMutate(chrom: Chromosome) {
    const F = this.freeSlots;
    const m = F.length;
    if (m < 2) return;
    const a = Math.floor(this.rng() * m);
    // Draw the second index from the remaining m-1 slots and shift it past `a`,
    // so the two are always distinct. A self-swap (i === j) is a no-op that
    // silently wastes a mutation event — at m free slots it happened ~1/m of
    // the time, throttling exploration late in a run when m is small.
    let b = Math.floor(this.rng() * (m - 1));
    if (b >= a) b++;
    const i = F[a];
    const j = F[b];
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
