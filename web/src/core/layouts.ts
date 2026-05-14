/**
 * Layout generators.
 *
 * Each layout type produces a flat list of Slots. A Slot is everything the
 * optimizer and the renderer need to know about one physical seat:
 *
 *   - `index` is the chromosome position (0..N-1).
 *   - `row` / `col` are logical coordinates. Row 0 = front, max row = back.
 *     Used for the front_row_ids / back_row_ids constraints and for
 *     accessibility scoring. Not all layouts have a strict grid; the row
 *     value still ranks seats from front to back (e.g. inner ring of a
 *     circle has lower row than outer ring).
 *   - `x` / `y` are normalized 0..1 render coordinates. The renderer
 *     multiplies by container size. The optimizer ignores these.
 *   - `neighbors` is the precomputed list of slot indices that are
 *     considered adjacent for fitness scoring. For grid-shaped layouts
 *     this is the 4-connected set; for circle it's the two ring
 *     neighbors; for clusters it's everyone within the same pod.
 *   - `isFront` / `isBack` are precomputed flags so the optimizer doesn't
 *     have to derive them.
 */

export type LayoutType =
  | 'rows'
  | 'clusters'
  | 'u-shape'
  | 'circle'
  | 'custom-rows';

export interface LayoutDef {
  type: LayoutType;
  rows: number;
  cols: number;
  /** For 'custom-rows': seats per row, front-to-back. */
  customRowSizes?: number[];
  /** For 'clusters': pod size (e.g. 2 → 2x2 pods of 4 students). Defaults to 2. */
  clusterSize?: number;
}

export interface Slot {
  index: number;
  row: number;
  col: number;
  /** Normalized 0..1 render coordinate (left → right). */
  x: number;
  /** Normalized 0..1 render coordinate (front → back). */
  y: number;
  isFront: boolean;
  isBack: boolean;
  neighbors: number[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function buildGridNeighbors(slots: Omit<Slot, 'neighbors'>[]): number[][] {
  // Manhattan-adjacent neighbors based on (row, col).
  const byKey = new Map<string, number>();
  for (const s of slots) byKey.set(`${s.row}|${s.col}`, s.index);
  return slots.map((s) =>
    [
      [s.row, s.col - 1],
      [s.row, s.col + 1],
      [s.row - 1, s.col],
      [s.row + 1, s.col],
    ]
      .map(([r, c]) => byKey.get(`${r}|${c}`))
      .filter((v): v is number => v !== undefined),
  );
}

function buildDistanceNeighbors(
  slots: Omit<Slot, 'neighbors'>[],
  threshold: number,
): number[][] {
  // Used for non-grid layouts (circle, clusters with gaps). Two slots are
  // neighbors if their Euclidean distance in normalized space is ≤ threshold.
  return slots.map((s) =>
    slots
      .filter((other) => other.index !== s.index)
      .filter((other) => {
        const dx = s.x - other.x;
        const dy = s.y - other.y;
        return Math.hypot(dx, dy) <= threshold;
      })
      .map((other) => other.index),
  );
}

// ── Rows layout (current default) ────────────────────────────────────────────

function rowsLayout(def: LayoutDef): Slot[] {
  const { rows, cols } = def;
  const partial: Omit<Slot, 'neighbors'>[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      partial.push({
        index: r * cols + c,
        row: r,
        col: c,
        x: cols > 1 ? c / (cols - 1) : 0.5,
        y: rows > 1 ? r / (rows - 1) : 0.5,
        isFront: r === 0,
        isBack: r === rows - 1,
      });
    }
  }
  const neighbors = buildGridNeighbors(partial);
  return partial.map((s, i) => ({ ...s, neighbors: neighbors[i] }));
}

// ── Custom-rows layout (variable seats per row) ──────────────────────────────

function customRowsLayout(def: LayoutDef): Slot[] {
  const sizes = (def.customRowSizes && def.customRowSizes.length > 0
    ? def.customRowSizes
    : Array.from({ length: def.rows }, () => def.cols)
  ).map((n) => Math.max(0, Math.floor(n)));

  const rows = sizes.length;
  const maxCols = Math.max(...sizes, 1);
  const partial: Omit<Slot, 'neighbors'>[] = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const n = sizes[r];
    for (let c = 0; c < n; c++) {
      // Center the row horizontally within maxCols so a "4 in front, 6 in
      // back" layout actually looks centered instead of left-aligned.
      const colOffset = (maxCols - n) / 2;
      partial.push({
        index: idx++,
        row: r,
        col: c,
        x: maxCols > 1 ? (c + colOffset) / (maxCols - 1) : 0.5,
        y: rows > 1 ? r / (rows - 1) : 0.5,
        isFront: r === 0,
        isBack: r === rows - 1,
      });
    }
  }
  // Use distance-based neighbors so a seat in a short row still sees the
  // seats above/below it even when columns don't align.
  const cellW = 1 / Math.max(1, maxCols - 1);
  const cellH = 1 / Math.max(1, rows - 1);
  const threshold = Math.hypot(cellW, cellH) * 1.05;
  const neighbors = buildDistanceNeighbors(partial, threshold);
  return partial.map((s, i) => ({ ...s, neighbors: neighbors[i] }));
}

// ── Clusters layout (pods of N×N around the room) ────────────────────────────

function clustersLayout(def: LayoutDef): Slot[] {
  const podSize = clamp(def.clusterSize ?? 2, 2, 4); // 2..4 seats per side
  // Round rows/cols up to multiples of podSize so every pod is full.
  const totalRows = Math.ceil(def.rows / podSize) * podSize;
  const totalCols = Math.ceil(def.cols / podSize) * podSize;
  const podRows = totalRows / podSize;
  const podCols = totalCols / podSize;

  const partial: Omit<Slot, 'neighbors'>[] = [];
  let idx = 0;
  // Gaps make the pods visually distinct.
  const gapFactor = 0.4; // an extra 0.4 cell of space between pods
  const totalUnitsX =
    podCols * podSize + (podCols - 1) * gapFactor;
  const totalUnitsY =
    podRows * podSize + (podRows - 1) * gapFactor;

  for (let pr = 0; pr < podRows; pr++) {
    for (let pc = 0; pc < podCols; pc++) {
      for (let ir = 0; ir < podSize; ir++) {
        for (let ic = 0; ic < podSize; ic++) {
          const row = pr * podSize + ir;
          const col = pc * podSize + ic;
          const xUnits = pc * (podSize + gapFactor) + ic;
          const yUnits = pr * (podSize + gapFactor) + ir;
          partial.push({
            index: idx++,
            row,
            col,
            x: totalUnitsX > 1 ? xUnits / (totalUnitsX - 1) : 0.5,
            y: totalUnitsY > 1 ? yUnits / (totalUnitsY - 1) : 0.5,
            isFront: row === 0,
            isBack: row === totalRows - 1,
          });
        }
      }
    }
  }
  // Pod-mates count as neighbors (a 2x2 pod = 3 neighbors per seat).
  const neighbors: number[][] = partial.map(() => []);
  // Group by pod, mark everyone in the same pod as a neighbor.
  const podOf = (s: Omit<Slot, 'neighbors'>) =>
    `${Math.floor(s.row / podSize)}|${Math.floor(s.col / podSize)}`;
  const byPod = new Map<string, number[]>();
  for (const s of partial) {
    const key = podOf(s);
    if (!byPod.has(key)) byPod.set(key, []);
    byPod.get(key)!.push(s.index);
  }
  for (const ids of byPod.values()) {
    for (const a of ids) {
      for (const b of ids) {
        if (a !== b) neighbors[a].push(b);
      }
    }
  }
  return partial.map((s, i) => ({ ...s, neighbors: neighbors[i] }));
}

// ── U-shape layout (perimeter seating, opening at the front) ─────────────────

function uShapeLayout(def: LayoutDef): Slot[] {
  const rows = Math.max(2, def.rows);
  const cols = Math.max(3, def.cols);
  const partial: Omit<Slot, 'neighbors'>[] = [];
  let idx = 0;

  // Three legs:
  //   - Front "open" side faces the teacher: NO front-row seats.
  //   - Left wall: rows 0..rows-1, col 0
  //   - Back wall: row rows-1, col 1..cols-2
  //   - Right wall: rows 0..rows-1, col cols-1
  // Logical row for fitness scoring is mapped so that the back wall is
  // "back row" and the seats near the front of the legs are "front row".

  const push = (r: number, c: number) => {
    partial.push({
      index: idx++,
      row: r,
      col: c,
      x: cols > 1 ? c / (cols - 1) : 0.5,
      y: rows > 1 ? r / (rows - 1) : 0.5,
      isFront: r === 0,
      isBack: r === rows - 1,
    });
  };

  // Left leg (top → bottom)
  for (let r = 0; r < rows; r++) push(r, 0);
  // Back row (left → right, skipping corners already added)
  for (let c = 1; c < cols - 1; c++) push(rows - 1, c);
  // Right leg (top → bottom)
  for (let r = 0; r < rows; r++) push(r, cols - 1);

  // Distance-based neighbors with a generous threshold so adjacent seats
  // along each leg/wall connect.
  const cellW = 1 / Math.max(1, cols - 1);
  const cellH = 1 / Math.max(1, rows - 1);
  const threshold = Math.hypot(cellW, cellH) * 1.05;
  const neighbors = buildDistanceNeighbors(partial, threshold);
  return partial.map((s, i) => ({ ...s, neighbors: neighbors[i] }));
}

// ── Circle layout (single ring of seats) ─────────────────────────────────────

function circleLayout(def: LayoutDef): Slot[] {
  // Total seats around the ring. We honor the existing rows*cols product
  // so re-running optimization on the same class size keeps the same
  // seat count.
  const total = Math.max(3, def.rows * def.cols);
  const partial: Omit<Slot, 'neighbors'>[] = [];
  // Ring center + radius in normalized 0..1 space.
  const cx = 0.5;
  const cy = 0.5;
  const radius = 0.42;

  // We rank "row" by angular position from the teacher (at the bottom).
  // Seats nearest the front (closest to the teacher) get row 0; seats at
  // the back of the ring get the highest row.
  for (let i = 0; i < total; i++) {
    // Start at the bottom (PI/2 below center), go clockwise.
    const angle = -Math.PI / 2 + (i / total) * Math.PI * 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    // Distance from the teacher (front of room, y=1 in our space).
    const distFromTeacher = 1 - y;
    // Map distFromTeacher (≈ 0..1) into a discrete row index for scoring.
    const row = Math.round(distFromTeacher * (def.rows - 1));
    partial.push({
      index: i,
      row,
      col: i,
      x,
      y,
      isFront: row === 0,
      isBack: row === def.rows - 1,
    });
  }
  // Ring neighbors: left + right around the circle.
  const neighbors = partial.map((s) => {
    const left = (s.index - 1 + total) % total;
    const right = (s.index + 1) % total;
    return [left, right];
  });
  return partial.map((s, i) => ({ ...s, neighbors: neighbors[i] }));
}

// ── Public entry point ──────────────────────────────────────────────────────

export function generateSlots(def: LayoutDef): Slot[] {
  switch (def.type) {
    case 'clusters':
      return clustersLayout(def);
    case 'u-shape':
      return uShapeLayout(def);
    case 'circle':
      return circleLayout(def);
    case 'custom-rows':
      return customRowsLayout(def);
    case 'rows':
    default:
      return rowsLayout(def);
  }
}

/** Convenience: how many seats does this layout produce? */
export function slotCount(def: LayoutDef): number {
  return generateSlots(def).length;
}
