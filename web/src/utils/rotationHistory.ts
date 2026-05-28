/**
 * Rotation tracker — answers "when did this student last sit next to
 * each of their current neighbors?".
 *
 * Reads the rolling `resultHistory` stored in the Zustand store. The
 * history is just a list of timestamped position snapshots; this
 * helper translates them into per-neighbor freshness data.
 */

import type { LayoutDef } from '../core/layouts';
import { generateSlots } from '../core/layouts';

export interface RotationEntry {
  /** Other student's id. */
  otherId: string;
  /** ISO timestamp of the most recent run where they were adjacent,
   *  or null if they've never been adjacent in our history window. */
  lastAdjacentAt: string | null;
  /** Total number of runs in our history where they sat adjacent. */
  timesAdjacent: number;
}

export function getNeighborHistory(
  studentId: string,
  layoutDef: LayoutDef,
  resultHistory: Array<{
    timestamp: string;
    positions: Record<string, { row: number; col: number }>;
  }>,
): RotationEntry[] {
  if (resultHistory.length === 0) return [];

  // Generate slots once. We rebuild adjacency per snapshot since the
  // layout might have changed between runs.
  const slots = generateSlots(layoutDef);
  // Map (row,col) → slot.index, plus slot.neighbors → student-id-set.
  const slotByCoord = new Map<string, number>();
  for (const s of slots) slotByCoord.set(`${s.row}|${s.col}`, s.index);

  const seen = new Map<string, RotationEntry>();

  for (const snapshot of resultHistory) {
    const pos = snapshot.positions[studentId];
    if (!pos) continue;
    const myIdx = slotByCoord.get(`${pos.row}|${pos.col}`);
    if (myIdx === undefined) continue;
    const neighborSlots = slots[myIdx]?.neighbors ?? [];
    const positionBySlot = new Map<number, string>();
    for (const [id, p] of Object.entries(snapshot.positions)) {
      const idx = slotByCoord.get(`${p.row}|${p.col}`);
      if (idx !== undefined) positionBySlot.set(idx, id);
    }
    for (const nIdx of neighborSlots) {
      const otherId = positionBySlot.get(nIdx);
      if (!otherId || otherId === studentId) continue;
      const existing = seen.get(otherId);
      if (existing) {
        existing.timesAdjacent += 1;
        // Snapshots are stored newest-first, so the first timestamp we
        // see for a pair is the most recent.
      } else {
        seen.set(otherId, {
          otherId,
          lastAdjacentAt: snapshot.timestamp,
          timesAdjacent: 1,
        });
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Build a penalty table the optimizer can use to *avoid* re-seating
 * students who recently sat next to each other ("freshen the seating").
 *
 * Returns a plain object keyed by a canonical unordered pair id
 * (`"idA|idB"` with the two ids sorted) → penalty weight in (0, 1].
 * Recent runs weigh more than older ones: the most recent snapshot
 * contributes `1`, the next `decay`, then `decay²`, … A pair seen in
 * several recent runs accumulates (capped at 1).
 *
 * Plain object (not a Map) so it survives `postMessage` to the worker
 * unchanged regardless of structured-clone quirks.
 */
export function getRecentPairPenalties(
  layoutDef: LayoutDef,
  resultHistory: Array<{
    timestamp: string;
    positions: Record<string, { row: number; col: number }>;
  }>,
  options?: { maxSnapshots?: number; decay?: number },
): Record<string, number> {
  const maxSnapshots = options?.maxSnapshots ?? 5;
  const decay = options?.decay ?? 0.5;
  const penalties: Record<string, number> = {};
  if (resultHistory.length === 0) return penalties;

  const slots = generateSlots(layoutDef);
  const slotByCoord = new Map<string, number>();
  for (const s of slots) slotByCoord.set(`${s.row}|${s.col}`, s.index);

  resultHistory.slice(0, maxSnapshots).forEach((snapshot, i) => {
    const weight = Math.pow(decay, i); // i = 0 is the most recent run
    const idBySlot = new Map<number, string>();
    for (const [id, p] of Object.entries(snapshot.positions)) {
      const idx = slotByCoord.get(`${p.row}|${p.col}`);
      if (idx !== undefined) idBySlot.set(idx, id);
    }
    for (const slot of slots) {
      const a = idBySlot.get(slot.index);
      if (!a) continue;
      for (const nIdx of slot.neighbors) {
        const b = idBySlot.get(nIdx);
        // Count each unordered pair once (a < b) to avoid double-weighting.
        if (!b || a >= b) continue;
        const key = `${a}|${b}`;
        penalties[key] = Math.min(1, (penalties[key] ?? 0) + weight);
      }
    }
  });

  return penalties;
}

/** Human-friendly "2 days ago" / "just now" formatter. Pure, no
 *  external dependency. Returns null for invalid input. */
export function relativeTime(iso: string | null, now: Date = new Date()): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  const seconds = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  const months = Math.floor(days / 30);
  return `${months} mo ago`;
}
