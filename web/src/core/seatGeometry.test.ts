import { describe, it, expect } from 'vitest';
import { slotXExtent, edgeMargin, isWindowSlot, isAisleSlot } from './seatGeometry';
import { generateSlots } from './layouts';

describe('seatGeometry', () => {
  it('measures the x-extent of a slot set (and falls back to 0..1 when empty)', () => {
    expect(slotXExtent([{ x: 0.2 }, { x: 0.8 }, { x: 0.5 }])).toEqual({ xMin: 0.2, xMax: 0.8 });
    expect(slotXExtent([])).toEqual({ xMin: 0, xMax: 1 });
  });

  it('scales the edge margin to the layout width, with a 0.02 floor', () => {
    expect(edgeMargin(0, 1)).toBeCloseTo(0.06, 5); // 6% of full width
    expect(edgeMargin(0.5, 0.5)).toBe(0.02); // zero-width → floor
  });

  it('classifies window (left wall) and aisle (either wall) relative to the extent', () => {
    // Full-width layout: window band is x ≤ 0.06, aisle band is x ≤ 0.06 or ≥ 0.94.
    expect(isWindowSlot(0.03, 0, 1)).toBe(true);
    expect(isWindowSlot(0.5, 0, 1)).toBe(false);
    expect(isWindowSlot(0.97, 0, 1)).toBe(false); // right wall is not the window
    expect(isAisleSlot(0.03, 0, 1)).toBe(true);
    expect(isAisleSlot(0.97, 0, 1)).toBe(true);
    expect(isAisleSlot(0.5, 0, 1)).toBe(false);
  });

  it('registers edge seats on a circle whose x never reaches 0 or 1', () => {
    // A circle's seats sit inside ~[0.08, 0.92], so an absolute 0/1 test would
    // find no window/aisle seat. The relative margin still classifies them.
    const slots = generateSlots({ type: 'circle', rows: 3, cols: 6 });
    const { xMin, xMax } = slotXExtent(slots);
    expect(xMin).toBeGreaterThan(0); // never touches the absolute wall
    expect(slots.some((s) => isWindowSlot(s.x, xMin, xMax))).toBe(true);
    expect(slots.some((s) => isAisleSlot(s.x, xMin, xMax))).toBe(true);
  });
});
