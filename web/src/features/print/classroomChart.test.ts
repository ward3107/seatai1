import { describe, expect, it } from 'vitest';
import { generateSlots, type LayoutDef } from '../../core/layouts';
import type { Student, Seat } from '../../types';
import { createClassroomChart, PAGE_HEIGHT, PAGE_WIDTH, wrapText } from './classroomChart';

function fixture(layout: LayoutDef) {
  const slots = generateSlots(layout);
  const students: Student[] = slots.map((_, i) => ({ id: `pupil-${i}`, name: i % 2 ? 'محمد عبد الرحمن الخطيب' : 'נועה אביגיל כהן לוי', gender: 'other', academic_level: 'advanced', academic_score: 92, behavior_level: 'good', behavior_score: 84, friends_ids: [], incompatible_ids: [], special_needs: [], requires_front_row: true, requires_quiet_area: false, has_mobility_issues: true, is_bilingual: false, notes: 'CONFIDENTIAL-NOTE', photo_url: 'https://private.example/pupil.png' }));
  const seats: Seat[] = slots.map((slot, i) => ({ position: { row: slot.row, col: slot.col, x: slot.x, y: slot.y, is_front_row: slot.isFront, is_near_teacher: false }, student_id: students[i].id, is_empty: false }));
  return { layout, seats, students };
}

describe('complete printable classroom charts', () => {
  for (const layout of [
    { type: 'rows', rows: 6, cols: 6, roomFeatures: [] },
    { type: 'rows', rows: 10, cols: 6, blockedCells: [{ row: 0, col: 0, kind: 'desk' }, { row: 2, col: 3, kind: 'obstacle' }], roomFeatures: [{ id: 'd', kind: 'door', x: 1, y: 0.8 }, { id: 'w', kind: 'window', x: 0, y: 0.5 }] },
    { type: 'custom-rows', rows: 4, cols: 4, customRowSizes: [4, 8, 6, 10] },
    { type: 'clusters', rows: 6, cols: 8, clusterSize: 2 },
    { type: 'u-shape', rows: 8, cols: 8 },
    { type: 'circle', rows: 5, cols: 8, roomFeatures: [] },
    { type: 'circle', rows: 6, cols: 10, roomFeatures: [] },
  ] satisfies LayoutDef[]) {
    it(`retains every actual seat and name, with no overlapping tiles: ${layout.type}/${layout.rows}`, () => {
      const input = fixture(layout);
      const chart = createClassroomChart({ ...input, language: 'he', date: new Date('2026-10-07T12:00:00Z') });
      expect(chart.unseatedCount).toBe(0);
      expect(chart.seats).toHaveLength(input.seats.length);
      expect(chart.seats.map(seat => seat.name)).toEqual(input.students.map(student => student.name));
      for (let i = 0; i < chart.seats.length; i++) {
        const seat = chart.seats[i];
        expect(seat.x - seat.width / 2).toBeGreaterThan(25);
        expect(seat.x + seat.width / 2).toBeLessThan(PAGE_WIDTH - 25);
        expect(seat.y - seat.height / 2).toBeGreaterThan(190);
        expect(seat.y + seat.height / 2).toBeLessThan(PAGE_HEIGHT - 100);
        for (const other of chart.seats.slice(i + 1)) {
          expect(Math.abs(seat.x - other.x) >= seat.width || Math.abs(seat.y - other.y) >= seat.height).toBe(true);
        }
      }
      for (let i = 0; i < chart.labels.length; i++) {
        const label = chart.labels[i];
        for (const other of chart.labels.slice(i + 1)) expect(Math.abs(label.x - other.x) >= label.width || Math.abs(label.y - other.y) >= label.height).toBe(true);
      }
      expect(chart.svg).not.toMatch(/CONFIDENTIAL-NOTE|private\.example|pupil-|academic|▲|♿/);
      if (layout.type === 'custom-rows') expect(chart.seats.filter(seat => seat.row === 3)).toHaveLength(10);
      if (layout.roomFeatures?.length) expect(chart.svg).toContain('data-chart-feature="door"');
    });
  }
  it('keeps physical left/right in RTL, and matches old row charts that inherited RTL', () => {
    const modern = fixture({ type: 'rows', rows: 2, cols: 4, roomFeatures: [] });
    const en = createClassroomChart({ ...modern, language: 'en' });
    const he = createClassroomChart({ ...modern, language: 'he' });
    expect(he.seats.map(({ x, y }) => ({ x, y }))).toEqual(en.seats.map(({ x, y }) => ({ x, y })));
    const legacy = createClassroomChart({ ...modern, layout: { ...modern.layout, roomFeatures: undefined }, language: 'he' });
    expect(legacy.seats[0].x).toBeGreaterThan(legacy.seats[3].x);
    expect(he.seats[0].x).toBeLessThan(he.seats[3].x);
  });
  it('preserves long names and escapes hostile names/titles instead of creating SVG elements', () => {
    expect(wrapText('אברהםבנימיןגבריאלדניאל', 42, 12).join('')).toBe('אברהםבנימיןגבריאלדניאל');
    const input = fixture({ type: 'rows', rows: 1, cols: 1 });
    input.students[0].name = '<script>alert(1)</script> & "name"';
    const chart = createClassroomChart({ ...input, title: '<img onerror="bad">', language: 'he' });
    const svg = new DOMParser().parseFromString(chart.svg, 'image/svg+xml');
    expect(svg.querySelector('parsererror')).toBeNull();
    expect(svg.querySelector('script,img')).toBeNull();
    expect(svg.querySelector('[data-chart-seat] title')?.textContent).toContain(input.students[0].name);
  });
  it('reports newly added pupils without a seat and ignores orphan profile IDs', () => {
    const input = fixture({ type: 'rows', rows: 1, cols: 2 });
    input.students.push({ ...input.students[0], id: 'new-pupil', name: 'New pupil' });
    input.seats[1].student_id = 'removed-profile-id';
    const chart = createClassroomChart({ ...input, language: 'en' });
    expect(chart.unseatedCount).toBe(2);
    expect(chart.svg).not.toContain('removed-profile-id');
    expect(chart.seats[1].name).toBe('');
  });
  it('requires explicit teacher markers and suppresses them when names are anonymized', () => {
    const input = fixture({ type: 'rows', rows: 1, cols: 2 });
    expect(createClassroomChart({ ...input, language: 'en', includeSensitive: true }).svg).toContain('▲');
    const privateChart = createClassroomChart({ ...input, language: 'en', includeSensitive: true, anonymize: true });
    expect(privateChart.svg).not.toContain('▲');
    expect(privateChart.svg).not.toContain(input.students[0].name);
    expect(privateChart.svg).not.toContain('CONFIDENTIAL-NOTE');
  });
});
