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
