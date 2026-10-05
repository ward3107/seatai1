import { describe, expect, it } from 'vitest';
import type { LayoutDef, RoomFeature } from '../../core/layouts';
import { featurePosition, featureWall, nextFeaturePosition, onWall, roomGeometry, teacherFits, wallPositionAvailable, SEAT_WIDTH, SEAT_HEIGHT } from './roomGeometry';

describe('physical room geometry', () => {
  for (const type of ['rows', 'custom-rows', 'circle', 'u-shape', 'clusters'] as const) {
    it(`${type}: keeps seats inside the room and apart in a large class`, () => {
      const geometry = roomGeometry({ type, rows: 5, cols: 8, customRowSizes: [3, 8, 6, 8, 4] });
      for (const seat of geometry.seats) {
        expect(seat.left - SEAT_WIDTH / 2).toBeGreaterThan(40);
        expect(seat.top - SEAT_HEIGHT / 2).toBeGreaterThan(70);
        expect(seat.left + SEAT_WIDTH / 2).toBeLessThan(geometry.width - 40);
        expect(seat.top + SEAT_HEIGHT / 2).toBeLessThan(geometry.height - 10);
        for (const other of geometry.seats) if (other.index !== seat.index) {
          expect(Math.abs(seat.left - other.left) >= SEAT_WIDTH + 10 || Math.abs(seat.top - other.top) >= SEAT_HEIGHT + 10).toBe(true);
        }
      }
    });
  }
  it('keeps a fully reserved row and its physical positions', () => {
    const layout: LayoutDef = { type: 'rows', rows: 2, cols: 2, blockedCells: [{row:0,col:0,kind:'desk'},{row:0,col:1,kind:'obstacle'}] };
    const geometry = roomGeometry(layout);
    expect(geometry.seats).toHaveLength(2);
    expect(geometry.decorations).toHaveLength(2);
    expect(geometry.decorations[0].top).toBeLessThan(geometry.seats[0].top);
    expect(geometry.decorations[0].left).toBe(geometry.seats[0].left);
  });
  it('adds windows at distinct positions instead of piling them up', () => {
    const geometry = roomGeometry({type:'rows',rows:4,cols:8});
    const features: RoomFeature[] = [];
    for (let i=0;i<4;i++) {
      const point = nextFeaturePosition('window', features, geometry)!;
      expect(wallPositionAvailable(features, point)).toBe(true);
      features.push({id:String(i),kind:'window',...point});
    }
    expect(new Set(features.map(f=>f.y)).size).toBe(4);
    expect(features.every(f=>f.x===0)).toBe(true);
  });
  it('anchors numeric and pointer edits to a wall and away from corners', () => {
    const geometry = roomGeometry({type:'rows',rows:4,cols:8});
    expect(featurePosition('window',0.1,0.7,geometry)).toEqual({x:0,y:0.7});
    expect(onWall('front',1)).toEqual({x:0.92,y:0});
    expect(featureWall(onWall('right',0))).toBe('right');
  });
  it('places a new teacher desk in free space and rejects occupied space', () => {
    const geometry = roomGeometry({type:'rows',rows:4,cols:8});
    expect(teacherFits(nextFeaturePosition('teacher',[],geometry)!,geometry)).toBe(true);
    const seat = geometry.seats[0];
    expect(teacherFits({x:seat.left/geometry.width,y:seat.top/geometry.height},geometry)).toBe(false);
  });
});
