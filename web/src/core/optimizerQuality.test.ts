/**
 * Quality regression tests for the optimizer.
 *
 * The other suite checks that optimize() returns a *valid* chart (everyone
 * seated, right shape, etc.). These tests check that it returns a *good* one:
 * measurably better than random seating on the things teachers care about —
 * separating incompatible pairs, sitting friends together, honouring front-row
 * needs, and balancing ability. If a future change quietly makes the algorithm
 * worse (not broken, just worse), these fail.
 *
 * They are written to be seed‑tolerant: the optimizer is compared against the
 * *average* of many random arrangements rather than a single lucky one, so
 * they assert a real quality gap, not a brittle exact layout.
 */

import { describe, it, expect } from 'vitest';
import { ClassroomOptimizer, mulberry32 } from './optimizer';
import { generateSlots } from './layouts';
import type { Student } from '../types';

// ── A synthetic class with clear structure to optimize ────────────────────────

type Spec = {
  id: string;
  academic: number;
  friends?: string[];
  incompatible?: string[];
  front?: boolean;
};

function student(spec: Spec): Student {
  return {
    id: spec.id,
    name: `S${spec.id}`,
    gender: Number(spec.id) % 2 ? 'male' : 'female',
    academic_level: 'proficient',
    academic_score: spec.academic,
    behavior_level: 'good',
    behavior_score: 70,
    friends_ids: spec.friends ?? [],
    incompatible_ids: spec.incompatible ?? [],
    special_needs: [],
    requires_front_row: !!spec.front,
    requires_quiet_area: false,
    has_mobility_issues: false,
    is_bilingual: false,
  } as unknown as Student;
}

// 12 students on a 3×4 grid (every seat filled). Three friend pairs, two
// incompatible pairs, one front-row need, a spread of academic scores.
const specs: Spec[] = [
  { id: '1', academic: 95, friends: ['2'], incompatible: ['3'] },
  { id: '2', academic: 90, friends: ['1'] },
  { id: '3', academic: 30, incompatible: ['1'] },
  { id: '4', academic: 85, friends: ['5'], front: true },
  { id: '5', academic: 40, friends: ['4'] },
  { id: '6', academic: 75, incompatible: ['7'] },
  { id: '7', academic: 35, incompatible: ['6'] },
  { id: '8', academic: 60 },
  { id: '9', academic: 55, friends: ['10'] },
  { id: '10', academic: 50, friends: ['9'] },
  { id: '11', academic: 65 },
  { id: '12', academic: 45 },
];
const students = specs.map(student);
const byId = new Map(students.map((s) => [s.id, s]));

const LAYOUT = { type: 'rows', rows: 3, cols: 4 } as const;
const slots = generateSlots(LAYOUT);
const slotIndexByPos = new Map(slots.map((s) => [`${s.row}-${s.col}`, s.index]));

// Count incompatible / friend adjacencies for a slotIndex → studentId map,
// using the optimizer's own neighbour definition. Each unordered neighbour
// pair is counted once.
function adjacencyCounts(occupant: Map<number, string>) {
  let incompatible = 0;
  let friend = 0;
  for (const slot of slots) {
    const a = occupant.get(slot.index);
    if (!a) continue;
    const sa = byId.get(a)!;
    for (const n of slot.neighbors) {
      if (n <= slot.index) continue; // each pair once
      const b = occupant.get(n);
      if (!b) continue;
      const sb = byId.get(b)!;
      if (sa.incompatible_ids.includes(b) || sb.incompatible_ids.includes(a)) incompatible++;
      if (sa.friends_ids.includes(b) || sb.friends_ids.includes(a)) friend++;
    }
  }
  return { incompatible, friend };
}

function occupantFromResult(positions: Record<string, { row: number; col: number }>) {
  const occ = new Map<number, string>();
  for (const [id, p] of Object.entries(positions)) {
    const idx = slotIndexByPos.get(`${p.row}-${p.col}`);
    if (idx !== undefined) occ.set(idx, id);
  }
  return occ;
}

// Average random-seating quality across many shuffles — the baseline the
// optimizer must beat.
function randomBaseline(samples: number) {
  const rng = mulberry32(2024);
  let incompatible = 0;
  let friend = 0;
  for (let s = 0; s < samples; s++) {
    const order = [...students.map((st) => st.id)];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const occ = new Map<number, string>();
    order.forEach((id, i) => occ.set(slots[i].index, id));
    const c = adjacencyCounts(occ);
    incompatible += c.incompatible;
    friend += c.friend;
  }
  return { incompatible: incompatible / samples, friend: friend / samples };
}

function optimize(seed: number) {
  const o = new ClassroomOptimizer(students, LAYOUT);
  o.setRng(mulberry32(seed));
  return o.optimize();
}

describe('Optimizer quality (better than random)', () => {
  const baseline = randomBaseline(200);

  it('separates incompatible pairs far better than random', () => {
    // Across several seeds the optimizer should keep incompatible pairs apart;
    // random seating leaves some adjacent on average.
    const counts = [1, 2, 3, 4, 5].map((seed) => adjacencyCounts(occupantFromResult(optimize(seed).student_positions)).incompatible);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    expect(avg).toBeLessThan(baseline.incompatible);
    // Two incompatible pairs and 12 seats — it should usually clear them all.
    expect(Math.min(...counts)).toBe(0);
  });

  it('seats friends together more than random', () => {
    const counts = [1, 2, 3, 4, 5].map((seed) => adjacencyCounts(occupantFromResult(optimize(seed).student_positions)).friend);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    expect(avg).toBeGreaterThan(baseline.friend);
  });

  it('places a front-row-required student in the front row', () => {
    // requires_front_row feeds the special_needs objective; across seeds the
    // student should reliably land in row 0.
    const inFront = [1, 2, 3, 4, 5].filter((seed) => optimize(seed).student_positions['4'].row === 0).length;
    expect(inFront).toBeGreaterThanOrEqual(4); // at least 4 of 5 seeds
  });

  it('returns objective scores in range and a non-trivial fitness', () => {
    const r = optimize(7);
    for (const v of Object.values(r.objective_scores)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    // A structured, satisfiable class should score solidly on academic balance.
    expect(r.objective_scores.academic_balance).toBeGreaterThan(50);
  });
});
