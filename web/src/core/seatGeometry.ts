/**
 * Shared seat geometry: "is this seat on the aisle / by the window / at the
 * front?" — defined once so every consumer agrees.
 *
 * Aisle and window are the side-most seats, measured *relative to the layout's
 * actual x-extent* rather than absolute 0..1. Layouts whose seats don't span
 * the full width (a circle sits in x≈[0.08, 0.92]) would otherwise never
 * register any edge seat. The optimizer's fitness function, the seat-status
 * badges, the violation highlights, and the "why this seat" explanations all
 * route through here, so they can't drift apart and show a teacher a green ✓
 * and a red ⚠ for the same seat.
 */

import type { RoomFeature } from './layouts';

export type Wall = 'left' | 'right' | 'front' | 'back';
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

export function featureWall(feature: Pick<RoomFeature, 'x' | 'y'>): Wall {
  const distances = [feature.x, 1 - feature.x, feature.y, 1 - feature.y];
  return (['left', 'right', 'front', 'back'] as const)[distances.indexOf(Math.min(...distances))];
}
export function onWall(wall: Wall, position: number) {
  const p = clamp(position, 0.08, 0.92);
  return wall === 'left' ? { x: 0, y: p } : wall === 'right' ? { x: 1, y: p }
    : wall === 'front' ? { x: p, y: 0 } : { x: p, y: 1 };
}

/** Older backups may contain wall items inside the room. Use the same
 * canonical wall position for rendering, optimization and explanations. */
export function wallFeaturePosition(feature: Pick<RoomFeature, 'x' | 'y'>) {
  const wall = featureWall({ x: clamp(feature.x), y: clamp(feature.y) });
  return onWall(wall, wall === 'left' || wall === 'right' ? feature.y : feature.x);
}

function scoringFeaturePosition(feature: RoomFeature) {
  return feature.kind === 'teacher' ? feature : wallFeaturePosition(feature);
}

/** Min/max normalized x across a slot set. Falls back to the full 0..1 range
 *  for an empty set. */
export function slotXExtent(slots: { x: number }[]): { xMin: number; xMax: number } {
  if (slots.length === 0) return { xMin: 0, xMax: 1 };
  let xMin = Infinity;
  let xMax = -Infinity;
  for (const s of slots) {
    if (s.x < xMin) xMin = s.x;
    if (s.x > xMax) xMax = s.x;
  }
  return { xMin, xMax };
}

/** Side-wall margin, scaled to the layout width (never below 0.02 so a
 *  single-column layout still has a usable band). */
export function edgeMargin(xMin: number, xMax: number): number {
  return Math.max(0.02, (xMax - xMin) * 0.06);
}

/** By the window = within the margin of the left wall. */
export function isWindowSlot(x: number, xMin: number, xMax: number): boolean {
  return x <= xMin + edgeMargin(xMin, xMax);
}

/** On the aisle = within the margin of either side wall. */
export function isAisleSlot(x: number, xMin: number, xMax: number): boolean {
  const m = edgeMargin(xMin, xMax);
  return x <= xMin + m || x >= xMax - m;
}

/** An explicit empty room has no windows; absent data keeps legacy left-wall semantics. */
export function isRoomWindowSlot(slot: { x: number; y: number }, xMin: number, xMax: number,
  features?: import('./layouts').RoomFeature[]): boolean {
  if (features === undefined) return isWindowSlot(slot.x, xMin, xMax);
  const distance = roomFeatureDistance(slot, 'window', features);
  return distance !== null && distance <= 0.25;
}

export function roomFeatureDistance(slot: { x: number; y: number }, kind: import('./layouts').RoomFeature['kind'], features?: import('./layouts').RoomFeature[]): number | null {
  const matching = features?.filter(f => f.kind === kind) ?? [];
  return matching.length ? Math.min(...matching.map(f => {
    const point = scoringFeaturePosition(f);
    return Math.hypot(slot.x - point.x, slot.y - point.y);
  })) : null;
}
export function isNearTeacherSlot(slot: { x: number; y: number; isFront: boolean }, features?: import('./layouts').RoomFeature[]): boolean {
  if (features === undefined) return slot.isFront;
  const distance = roomFeatureDistance(slot, 'teacher', features);
  return distance !== null && distance <= 0.25;
}
