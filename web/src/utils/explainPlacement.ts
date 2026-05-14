/**
 * Per-student placement explanation.
 *
 * Given an optimization result and a student, produces a structured
 * breakdown of WHY the AI chose this particular seat:
 *
 *   - Placement reasons    — direct constraint matches (e.g. "front row
 *                            because of vision impairment", "near
 *                            window per teacher rule")
 *   - Strengths            — qualitative wins (peer support, behavioral
 *                            balance, friend adjacency, diversity)
 *   - Weaknesses           — tradeoffs the GA accepted to satisfy other
 *                            objectives (incompatible peer nearby, weak
 *                            diversity, far from teacher)
 *   - Neighbor breakdown   — each adjacent student with their relation
 *                            (friend / neutral / incompatible) and how
 *                            similar they are academically/behaviorally
 *   - Applied constraints  — explicit rules the teacher set that
 *                            influenced this placement
 *
 * Output is locale-key-friendly: each `reason` etc. is `{ key, vars }`
 * so the renderer can run it through the translation system. For
 * launch we ship English in code and let the locale system translate.
 */

import type {
  Student,
  OptimizationResult,
  SeatingConstraints,
} from '../types';
import { generateSlots, type LayoutDef } from '../core/layouts';

export interface ExplanationLine {
  /** Translation key for the reason. */
  key: string;
  /** Optional variables for interpolation in the locale string. */
  vars?: Record<string, string | number>;
  /** Severity / sentiment for UI styling. */
  tone: 'positive' | 'neutral' | 'caution' | 'negative';
}

export interface NeighborBreakdown {
  student: Student;
  relation: 'friend' | 'incompatible' | 'mentor' | 'mentee' | 'neutral';
  academicDiff: number;   // |their score - this student's score|
  behaviorDiff: number;
  sameGender: boolean;
  isPodMate?: boolean;
}

export interface PlacementExplanation {
  student: Student;
  slot: {
    row: number;
    col: number;
    isFront: boolean;
    isBack: boolean;
    isLeftEdge: boolean;
    isRightEdge: boolean;
  } | null;
  reasons: ExplanationLine[];
  strengths: ExplanationLine[];
  weaknesses: ExplanationLine[];
  neighbors: NeighborBreakdown[];
  /** Confidence label: how well does this placement satisfy hard rules? */
  confidence: 'high' | 'medium' | 'low';
}

const PERCENTILE_CLOSE = 15; // within 15 pts is "similar"

function classifyConfidence(
  reasons: ExplanationLine[],
  weaknesses: ExplanationLine[],
): 'high' | 'medium' | 'low' {
  const hardFailures = weaknesses.filter((w) => w.tone === 'negative').length;
  const constraintHits = reasons.filter((r) => r.tone === 'positive').length;
  if (hardFailures === 0 && constraintHits >= 2) return 'high';
  if (hardFailures > 0) return 'low';
  return 'medium';
}

export function explainPlacement(
  student: Student,
  result: OptimizationResult,
  layoutDef: LayoutDef,
  allStudents: Student[],
  constraints: SeatingConstraints,
): PlacementExplanation {
  const slots = generateSlots(layoutDef);
  const pos = result.student_positions[student.id];

  if (!pos) {
    // Student wasn't placed (too many students for the layout).
    return {
      student,
      slot: null,
      reasons: [],
      strengths: [],
      weaknesses: [{ key: 'explain.not_placed', tone: 'negative' }],
      neighbors: [],
      confidence: 'low',
    };
  }

  const mySlot = slots.find((s) => s.row === pos.row && s.col === pos.col);
  if (!mySlot) {
    return {
      student,
      slot: null,
      reasons: [],
      strengths: [],
      weaknesses: [{ key: 'explain.slot_not_found', tone: 'negative' }],
      neighbors: [],
      confidence: 'low',
    };
  }

  // ── Build neighbor breakdown ────────────────────────────────────────────
  const studentById = new Map(allStudents.map((s) => [s.id, s]));
  const seatBySlotIndex = new Map<number, string | undefined>();
  for (const seat of result.layout.seats) {
    const slot = slots.find(
      (s) => s.row === seat.position.row && s.col === seat.position.col,
    );
    if (slot) seatBySlotIndex.set(slot.index, seat.student_id);
  }

  const neighbors: NeighborBreakdown[] = [];
  for (const nIdx of mySlot.neighbors) {
    const nid = seatBySlotIndex.get(nIdx);
    if (!nid) continue;
    const n = studentById.get(nid);
    if (!n) continue;

    let relation: NeighborBreakdown['relation'] = 'neutral';
    if (student.friends_ids.includes(n.id)) relation = 'friend';
    if (student.incompatible_ids.includes(n.id)) relation = 'incompatible';
    const mentorPair = constraints.peer_mentor_pairs ?? [];
    if (mentorPair.some(([m, e]) => m === student.id && e === n.id)) {
      relation = 'mentee';
    }
    if (mentorPair.some(([m, e]) => e === student.id && m === n.id)) {
      relation = 'mentor';
    }

    neighbors.push({
      student: n,
      relation,
      academicDiff: Math.abs(student.academic_score - n.academic_score),
      behaviorDiff: Math.abs(student.behavior_score - n.behavior_score),
      sameGender: student.gender === n.gender,
    });
  }

  // ── Slot geometry ───────────────────────────────────────────────────────
  const isLeftEdge = mySlot.x <= 0.1;
  const isRightEdge = mySlot.x >= 0.9;
  const slotInfo = {
    row: mySlot.row,
    col: mySlot.col,
    isFront: mySlot.isFront,
    isBack: mySlot.isBack,
    isLeftEdge,
    isRightEdge,
  };

  // ── Direct placement reasons ────────────────────────────────────────────
  const reasons: ExplanationLine[] = [];

  // Hard requirements driven by the student's profile.
  if (
    (student.requires_front_row || student.has_mobility_issues) &&
    mySlot.isFront
  ) {
    reasons.push({
      key: student.has_mobility_issues
        ? 'explain.front_for_mobility'
        : 'explain.front_for_need',
      tone: 'positive',
    });
  }
  const visualNeed = student.special_needs.some(
    (n) =>
      n.type.toLowerCase().includes('vision') ||
      n.type.toLowerCase().includes('hear'),
  );
  if (visualNeed && mySlot.isFront) {
    reasons.push({ key: 'explain.front_for_sensory', tone: 'positive' });
  }

  // Teacher-set constraints.
  if (constraints.front_row_ids.includes(student.id) && mySlot.isFront) {
    reasons.push({ key: 'explain.front_by_rule', tone: 'positive' });
  } else if (constraints.front_row_ids.includes(student.id) && !mySlot.isFront) {
    reasons.push({ key: 'explain.front_by_rule_unmet', tone: 'negative' });
  }
  if (constraints.back_row_ids.includes(student.id) && mySlot.isBack) {
    reasons.push({ key: 'explain.back_by_rule', tone: 'positive' });
  }
  if (
    (constraints.aisle_ids ?? []).includes(student.id) &&
    (isLeftEdge || isRightEdge)
  ) {
    reasons.push({ key: 'explain.aisle_by_rule', tone: 'positive' });
  }
  if ((constraints.near_window_ids ?? []).includes(student.id) && isLeftEdge) {
    reasons.push({ key: 'explain.window_by_rule', tone: 'positive' });
  }

  // Quiet-area need satisfied via edge/front/back.
  if (
    student.requires_quiet_area &&
    (isLeftEdge || isRightEdge || mySlot.isFront || mySlot.isBack)
  ) {
    reasons.push({ key: 'explain.quiet_edge', tone: 'positive' });
  }

  // ── Strengths (qualitative wins) ────────────────────────────────────────
  const strengths: ExplanationLine[] = [];

  if (neighbors.length > 0) {
    const avgAcad =
      neighbors.reduce((s, n) => s + n.student.academic_score, 0) /
      neighbors.length;
    const acadGap = Math.abs(student.academic_score - avgAcad);
    if (acadGap <= PERCENTILE_CLOSE) {
      strengths.push({
        key: 'explain.peer_academic_balance',
        vars: { avg: Math.round(avgAcad) },
        tone: 'positive',
      });
    }
    const avgBeh =
      neighbors.reduce((s, n) => s + n.student.behavior_score, 0) /
      neighbors.length;
    const behGap = Math.abs(student.behavior_score - avgBeh);
    if (behGap <= PERCENTILE_CLOSE) {
      strengths.push({
        key: 'explain.peer_behavior_balance',
        vars: { avg: Math.round(avgBeh) },
        tone: 'positive',
      });
    }
    const friends = neighbors.filter((n) => n.relation === 'friend');
    if (friends.length > 0) {
      strengths.push({
        key: 'explain.friend_adjacent',
        vars: { count: friends.length, name: friends[0].student.name },
        tone: 'positive',
      });
    }
    const diverseGenders = neighbors.filter((n) => !n.sameGender).length;
    if (diverseGenders >= Math.ceil(neighbors.length / 2)) {
      strengths.push({ key: 'explain.diverse_neighbors', tone: 'positive' });
    }
    const mentorPair = neighbors.find(
      (n) => n.relation === 'mentor' || n.relation === 'mentee',
    );
    if (mentorPair) {
      strengths.push({
        key: 'explain.mentor_paired',
        vars: { name: mentorPair.student.name },
        tone: 'positive',
      });
    }
    const bilingualNeighbors = neighbors.filter(
      (n) => n.student.is_bilingual,
    ).length;
    if (student.is_bilingual && bilingualNeighbors > 0) {
      strengths.push({ key: 'explain.bilingual_support', tone: 'positive' });
    }
  }

  // ── Weaknesses (tradeoffs the GA accepted) ──────────────────────────────
  const weaknesses: ExplanationLine[] = [];

  // Incompatible peer nearby is a real cost.
  const incompatibleNeighbors = neighbors.filter(
    (n) => n.relation === 'incompatible',
  );
  if (incompatibleNeighbors.length > 0) {
    weaknesses.push({
      key: 'explain.incompatible_adjacent',
      vars: { name: incompatibleNeighbors[0].student.name },
      tone: 'negative',
    });
  }

  // Front-row need NOT satisfied.
  if (
    (student.requires_front_row || student.has_mobility_issues) &&
    !mySlot.isFront
  ) {
    weaknesses.push({ key: 'explain.front_need_unmet', tone: 'negative' });
  }
  // Aisle/window requested but unmet.
  if (
    (constraints.aisle_ids ?? []).includes(student.id) &&
    !isLeftEdge &&
    !isRightEdge
  ) {
    weaknesses.push({ key: 'explain.aisle_unmet', tone: 'negative' });
  }
  if (
    (constraints.near_window_ids ?? []).includes(student.id) &&
    !isLeftEdge
  ) {
    weaknesses.push({ key: 'explain.window_unmet', tone: 'negative' });
  }

  // Mentor pair not adjacent.
  const mentorRules = constraints.peer_mentor_pairs ?? [];
  for (const [mentor, mentee] of mentorRules) {
    if (student.id !== mentor && student.id !== mentee) continue;
    const partnerId = student.id === mentor ? mentee : mentor;
    const adjacent = neighbors.some((n) => n.student.id === partnerId);
    if (!adjacent && studentById.has(partnerId)) {
      weaknesses.push({
        key: 'explain.mentor_pair_unmet',
        vars: { name: studentById.get(partnerId)?.name ?? '' },
        tone: 'caution',
      });
    }
  }

  // All-same-gender pod is mild caution (not negative).
  if (neighbors.length >= 2 && neighbors.every((n) => n.sameGender)) {
    weaknesses.push({ key: 'explain.gender_homogeneous', tone: 'caution' });
  }

  // ── Confidence label ────────────────────────────────────────────────────
  const confidence = classifyConfidence(reasons, weaknesses);

  return {
    student,
    slot: slotInfo,
    reasons,
    strengths,
    weaknesses,
    neighbors,
    confidence,
  };
}
