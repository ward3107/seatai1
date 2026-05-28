import { describe, it, expect } from 'vitest';
import { generateSlots, slotCount } from './layouts';

describe('generateSlots', () => {
  describe('rows layout', () => {
    it('produces rows*cols slots with grid neighbors', () => {
      const slots = generateSlots({ type: 'rows', rows: 3, cols: 4 });
      expect(slots).toHaveLength(12);
      // Corner has 2 neighbors, edge has 3, interior has 4
      const cornerSlot = slots.find((s) => s.row === 0 && s.col === 0)!;
      expect(cornerSlot.neighbors).toHaveLength(2);
      const interior = slots.find((s) => s.row === 1 && s.col === 1)!;
      expect(interior.neighbors).toHaveLength(4);
    });

    it('flags front/back rows correctly', () => {
      const slots = generateSlots({ type: 'rows', rows: 3, cols: 3 });
      expect(slots.filter((s) => s.isFront)).toHaveLength(3);
      expect(slots.filter((s) => s.isBack)).toHaveLength(3);
      expect(slots.filter((s) => s.isFront && s.isBack)).toHaveLength(0);
    });
  });

  describe('blocked cells (desk / obstacles)', () => {
    it('removes blocked cells from the seat list and renumbers contiguously', () => {
      const slots = generateSlots({
        type: 'rows',
        rows: 3,
        cols: 3,
        blockedCells: [
          { row: 0, col: 1, kind: 'desk' },
          { row: 1, col: 1, kind: 'obstacle' },
        ],
      });
      expect(slots).toHaveLength(7); // 9 - 2
      // No surviving slot sits on a blocked cell.
      expect(slots.find((s) => s.row === 0 && s.col === 1)).toBeUndefined();
      expect(slots.find((s) => s.row === 1 && s.col === 1)).toBeUndefined();
      // Indices are contiguous 0..n-1 so they remain valid chromosome positions.
      expect([...slots.map((s) => s.index)].sort((a, b) => a - b)).toEqual([
        0, 1, 2, 3, 4, 5, 6,
      ]);
    });

    it('does not link seats across a blocked cell as neighbors', () => {
      // Row 0: col 0 and col 2 flank a blocked col 1 → they must NOT be neighbors.
      const slots = generateSlots({
        type: 'rows',
        rows: 1,
        cols: 3,
        blockedCells: [{ row: 0, col: 1, kind: 'obstacle' }],
      });
      expect(slots).toHaveLength(2);
      const left = slots.find((s) => s.col === 0)!;
      const right = slots.find((s) => s.col === 2)!;
      expect(left.neighbors).not.toContain(right.index);
      expect(right.neighbors).not.toContain(left.index);
    });

    it('slotCount reflects the reduced seat count', () => {
      expect(
        slotCount({
          type: 'rows',
          rows: 4,
          cols: 5,
          blockedCells: [
            { row: 0, col: 0, kind: 'desk' },
            { row: 2, col: 3, kind: 'obstacle' },
          ],
        }),
      ).toBe(18); // 20 - 2
    });
  });

  describe('clusters layout', () => {
    it('rounds class size up to a multiple of the pod size', () => {
      // 3x3 with podSize=2 → rounds up to 4x4 = 16 seats
      const slots = generateSlots({ type: 'clusters', rows: 3, cols: 3, clusterSize: 2 });
      expect(slots.length).toBeGreaterThanOrEqual(16);
    });

    it('makes pod-mates neighbors but not other pods', () => {
      const slots = generateSlots({ type: 'clusters', rows: 2, cols: 2, clusterSize: 2 });
      // 2x2 → one single pod, 4 seats, each with 3 pod-mates as neighbors
      expect(slots).toHaveLength(4);
      for (const s of slots) expect(s.neighbors).toHaveLength(3);
    });
  });

  describe('u-shape layout', () => {
    it('places only perimeter seats (no center)', () => {
      const slots = generateSlots({ type: 'u-shape', rows: 4, cols: 5 });
      // Left leg (4) + back wall (5-2=3) + right leg (4) = 11 seats
      expect(slots).toHaveLength(11);
      // No seat at center (row 1, col 2) — that's inside the U
      const center = slots.find((s) => s.row === 1 && s.col === 2);
      expect(center).toBeUndefined();
    });

    it('marks the back wall as isBack', () => {
      const slots = generateSlots({ type: 'u-shape', rows: 3, cols: 4 });
      const back = slots.filter((s) => s.isBack);
      // Back wall = entire bottom row. Three corners (incl. the two leg
      // endpoints) + 2 inner cells = 4 seats marked back.
      expect(back.length).toBe(4);
    });
  });

  describe('circle layout', () => {
    it('produces rows*cols seats on the ring', () => {
      const slots = generateSlots({ type: 'circle', rows: 3, cols: 5 });
      expect(slots).toHaveLength(15);
      // Every slot has exactly 2 ring neighbors
      for (const s of slots) expect(s.neighbors).toHaveLength(2);
    });

    it('places seats on a circle (distance from center is constant)', () => {
      const slots = generateSlots({ type: 'circle', rows: 2, cols: 6 });
      const distances = slots.map((s) =>
        Math.hypot(s.x - 0.5, s.y - 0.5),
      );
      const max = Math.max(...distances);
      const min = Math.min(...distances);
      expect(max - min).toBeLessThan(0.001);
    });
  });

  describe('custom-rows layout', () => {
    it('honors customRowSizes', () => {
      const slots = generateSlots({
        type: 'custom-rows',
        rows: 3,
        cols: 6,
        customRowSizes: [4, 6, 5],
      });
      expect(slots).toHaveLength(15);
      expect(slots.filter((s) => s.row === 0)).toHaveLength(4);
      expect(slots.filter((s) => s.row === 1)).toHaveLength(6);
      expect(slots.filter((s) => s.row === 2)).toHaveLength(5);
    });

    it('falls back to a uniform grid when customRowSizes is missing', () => {
      const slots = generateSlots({ type: 'custom-rows', rows: 2, cols: 3 });
      expect(slots).toHaveLength(6);
    });

    it('centers short rows visually', () => {
      const slots = generateSlots({
        type: 'custom-rows',
        rows: 2,
        cols: 6,
        customRowSizes: [2, 6],
      });
      // The two seats in row 0 should be centered: their x should be
      // symmetric around 0.5.
      const r0 = slots.filter((s) => s.row === 0);
      const sumX = r0.reduce((sum, s) => sum + s.x, 0);
      expect(sumX / r0.length).toBeCloseTo(0.5, 1);
    });
  });

  describe('slotCount', () => {
    it('matches generateSlots length', () => {
      const def = { type: 'rows' as const, rows: 4, cols: 5 };
      expect(slotCount(def)).toBe(generateSlots(def).length);
    });
  });
});
