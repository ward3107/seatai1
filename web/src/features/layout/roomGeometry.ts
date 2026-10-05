import { generateSlots, type LayoutDef, type RoomFeature, type Slot } from '../../core/layouts';
import { featureWall, onWall, wallFeaturePosition, type Wall } from '../../core/seatGeometry';

export { featureWall, onWall, type Wall } from '../../core/seatGeometry';
export const SEAT_WIDTH = 84;
export const SEAT_HEIGHT = 124;
export interface RoomGeometry {
  width: number;
  height: number;
  seats: (Slot & { left: number; top: number })[];
  decorations: { row: number; col: number; kind: 'desk' | 'obstacle'; left: number; top: number }[];
}
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

/** The editor and live chart use the same physical, LTR room projection.
 * Leave a perimeter and a front aisle; grow dense shapes instead of shrinking seats. */
export function roomGeometry(layout: LayoutDef): RoomGeometry {
  const slots = generateSlots(layout);
  const allSlots = generateSlots({ ...layout, blockedCells: [] });
  const areaWidth = Math.max(280, (Math.max(layout.cols, ...(layout.customRowSizes ?? [])) - 1) * 108);
  const areaHeight = Math.max(192, (layout.rows - 1) * 144);
  let scale = 1;
  for (let i = 0; i < allSlots.length; i++) {
    for (let j = i + 1; j < allSlots.length; j++) {
      const dx = Math.abs(allSlots[i].x - allSlots[j].x) * areaWidth;
      const dy = Math.abs(allSlots[i].y - allSlots[j].y) * areaHeight;
      if (dx < 0.0001 && dy < 0.0001) continue;
      scale = Math.max(scale, Math.min(104 / dx, 144 / dy));
    }
  }
  const w = Math.ceil(areaWidth * scale);
  const h = Math.ceil(areaHeight * scale);
  return {
    width: w + 208, height: h + 252,
    seats: slots.map(slot => ({ ...slot, left: 104 + slot.x * w, top: 168 + slot.y * h })),
    decorations: (layout.blockedCells ?? []).flatMap(cell => {
      const slot = allSlots.find(s => s.row === cell.row && s.col === cell.col);
      return slot && (layout.type === 'rows' || layout.type === 'custom-rows')
        ? [{ ...cell, left: 104 + slot.x * w, top: 168 + slot.y * h }] : [];
    }),
  };
}

export function featurePosition(kind: RoomFeature['kind'], x: number, y: number, geometry: RoomGeometry) {
  if (kind === 'teacher') return {
    x: clamp(x, 60 / geometry.width, 1 - 60 / geometry.width),
    y: clamp(y, 24 / geometry.height, 1 - 24 / geometry.height),
  };
  return wallFeaturePosition({ x, y });
}
export function teacherFits(position: { x: number; y: number }, geometry: RoomGeometry) {
  return [...geometry.seats, ...geometry.decorations].every(seat => Math.abs(seat.left - position.x * geometry.width) >= 124 ||
    Math.abs(seat.top - position.y * geometry.height) >= 96);
}
export function wallPositionAvailable(features: RoomFeature[], position: { x: number; y: number }, excludeId?: string) {
  return features.every(feature => {
    const point = wallFeaturePosition(feature);
    return feature.id === excludeId || feature.kind === 'teacher' ||
      featureWall(point) !== featureWall(position) ||
      Math.hypot(point.x - position.x, point.y - position.y) >= 0.14;
  });
}
export function nextFeaturePosition(kind: RoomFeature['kind'], features: RoomFeature[], geometry: RoomGeometry) {
  if (kind === 'teacher') return { x: 0.5, y: 64 / geometry.height };
  const walls: Wall[] = kind === 'window' ? ['left', 'right', 'front', 'back'] : ['right', 'left', 'back', 'front'];
  for (const wall of walls) for (const p of [0.5, 0.2, 0.8, 0.35, 0.65]) {
    const position = onWall(wall, p);
    if (wallPositionAvailable(features, position)) return position;
  }
  return null;
}
