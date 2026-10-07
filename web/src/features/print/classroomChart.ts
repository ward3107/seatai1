import type { LayoutDef } from '../../core/layouts';
import type { Seat, Student } from '../../types';
import { translate, type UILanguage } from '../../lib/i18n';
import { featurePosition, featureWall, roomGeometry } from '../layout/roomGeometry';

// A complete A4 landscape page, including safe printer margins. Its coordinates
// never come from the visible/zoomed DOM or the device's viewport.
export const PAGE_WIDTH = 1123;
export const PAGE_HEIGHT = 794;
const FONT = 'Arial, sans-serif';
const ROOM = { x: 54, y: 190, width: 1015, height: 492 };
const COLORS = ['#f0fdfa', '#eff6ff', '#f5f3ff', '#fff7ed'];
export type TextMeasure = (text: string, fontSize: number) => number;
const approximateMeasure: TextMeasure = (text, size) => Array.from(text).length * size * 0.58;

export interface ChartOptions {
  seats: readonly Seat[];
  students: readonly Student[];
  layout: LayoutDef;
  language: UILanguage;
  title?: string;
  paired?: boolean;
  anonymize?: boolean;
  includeSensitive?: boolean;
  date?: Date;
  measure?: TextMeasure;
}
export interface ChartSeat {
  row: number; col: number; number: number; name: string;
  x: number; y: number; width: number; height: number;
}
export interface ClassroomChart {
  svg: string; title: string; seats: ChartSeat[]; labels: ChartSeat[]; unseatedCount: number;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
}
const round = (n: number) => Number(n.toFixed(3));
const direction = (text: string) => /^[^A-Za-z\u0590-\u08ff]*[\u0590-\u08ff]/u.test(text) ? 'rtl' : 'ltr';

export function wrapText(value: string, width: number, size: number, measure: TextMeasure = approximateMeasure): string[] {
  const words = value.trim().split(/\s+/u);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, size) <= width) { line = candidate; continue; }
    if (line) { lines.push(line); line = ''; }
    // Even an unbroken long surname is preserved, without ellipses or clipping.
    for (const char of Array.from(word)) {
      if (line && measure(line + char, size) > width) { lines.push(line); line = ''; }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fittedText(value: string, x: number, y: number, width: number, height: number, maxSize: number, measure: TextMeasure, weight = 600, fill = '#172b3a'): string {
  let size = maxSize;
  let lines = wrapText(value, width, size, measure);
  while (size > 4 && lines.length * size * 1.16 > height) {
    size -= 0.5; lines = wrapText(value, width, size, measure);
  }
  const start = y - (lines.length - 1) * size * 0.58 + size * 0.34;
  return `<text text-anchor="middle" direction="${direction(value)}" unicode-bidi="plaintext" font-size="${round(size)}" font-weight="${weight}" fill="${fill}">${lines.map((line, i) => `<tspan x="${round(x)}" y="${round(start + i * size * 1.16)}">${escapeXml(line)}</tspan>`).join('')}</text>`;
}
function rect(x: number, y: number, width: number, height: number, fill: string, stroke = '#b4c6cd', radius = 9): string {
  return `<rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="1.3"/>`;
}

/** Only names and positions enter the shared chart. Profiles/notes/warnings are
 * never serialized; optional teacher markers are a separate explicit choice. */
export function createClassroomChart(options: ChartOptions): ClassroomChart {
  const { layout, language } = options;
  const t = (key: string, values?: Record<string, string | number>) => translate(language, key, values);
  const title = options.title?.trim() || t('print.chart_title');
  const measure = options.measure ?? approximateMeasure;
  const geometry = roomGeometry(layout);
  const mirrorLegacyRows = layout.roomFeatures === undefined && ['rows', 'custom-rows'].includes(layout.type) && ['he', 'ar'].includes(language);
  const project = (left: number, top: number) => ({
    x: ROOM.x + (mirrorLegacyRows ? 1 - left / geometry.width : left / geometry.width) * ROOM.width,
    y: ROOM.y + top / geometry.height * ROOM.height,
  });
  const students = new Map(options.students.map(student => [student.id, student]));
  const assignments = new Map(options.seats.map(seat => [`${seat.position.row}:${seat.position.col}`, seat.student_id]));
  const points = [...geometry.seats, ...geometry.decorations].map(point => ({ ...point, ...project(point.left, point.top) }));
  const circle = layout.type === 'circle';
  const preferredWidth = circle ? 116 : 156;
  const preferredHeight = circle ? 47 : 66;
  let scale = 1;
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    scale = Math.min(scale, Math.max(Math.abs(points[i].x - points[j].x) / (preferredWidth + 12), Math.abs(points[i].y - points[j].y) / (preferredHeight + 12)));
  }
  const width = preferredWidth * scale, height = preferredHeight * scale;
  const assignedIds = new Set(geometry.seats.map(point => assignments.get(`${point.row}:${point.col}`)).filter(Boolean));
  const unseatedCount = options.students.filter(student => !assignedIds.has(student.id)).length;
  const occupied = options.students.length - unseatedCount;
  const date = (options.date ?? new Date()).toLocaleDateString(language);
  const sensitive = options.includeSensitive && !options.anonymize;
  let drawing = rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, '#ffffff', '#ffffff', 0);
  drawing += fittedText(title, PAGE_WIDTH / 2, 65, ROOM.width, 54, 30, measure, 700);
  drawing += fittedText(`${t('print.student_count', { count: occupied })}  ·  ${date}`, PAGE_WIDTH / 2, 113, ROOM.width, 22, 13, measure, 400, '#526775');
  drawing += `<path d="M54 132H1069" stroke="#dce5e9"/>`;
  drawing += rect(ROOM.x, ROOM.y, ROOM.width, ROOM.height, '#ffffff', '#91a7b4', 16);
  drawing += rect(PAGE_WIDTH / 2 - 113, ROOM.y - 45, 226, 28, '#e6f6f3', '#64a69a', 7);
  drawing += fittedText(t('print.teacher_board'), PAGE_WIDTH / 2, ROOM.y - 31, 206, 24, 13, measure);

  // Desk outlines make pairs / working groups recognisable without changing
  // their physical coordinates or encoding pupil attributes in the colours.
  const groups = new Map<string, typeof geometry.seats>();
  if (layout.type === 'clusters' || (options.paired && ['rows', 'custom-rows'].includes(layout.type))) {
    const pod = layout.type === 'clusters' ? Math.max(2, Math.min(4, layout.clusterSize ?? 2)) : 2;
    for (const point of geometry.seats) {
      if (layout.type !== 'clusters' && layout.blockedCells?.some(cell => cell.row === point.row)) continue;
      const key = layout.type === 'clusters' ? `${Math.floor(point.row / pod)}:${Math.floor(point.col / pod)}` : `${point.row}:${Math.floor(point.col / pod)}`;
      const group = groups.get(key) ?? []; group.push(point); groups.set(key, group);
    }
    for (const group of groups.values()) {
      const positions = group.map(point => project(point.left, point.top));
      const x = Math.min(...positions.map(p => p.x)) - width / 2 - 5;
      const y = Math.min(...positions.map(p => p.y)) - height / 2 - 5;
      drawing += rect(x, y, Math.max(...positions.map(p => p.x)) - x + width / 2 + 5, Math.max(...positions.map(p => p.y)) - y + height / 2 + 5, '#f8fafb', '#dce5e9', 11);
    }
  }
  if (['rows', 'custom-rows'].includes(layout.type)) {
    const rows = new Map(points.map(point => [point.row, point.y]));
    for (const [row, y] of rows) drawing += fittedText(t('print.row_label', { number: row + 1 }), ROOM.x + 35, y, 58, 30, 10, measure, 400, '#617886');
  }
  const chartSeats: ChartSeat[] = [];
  const chartLabels: ChartSeat[] = [];
  // A dense circle needs callouts, otherwise names shrink into unreadable
  // slivers around its sides. Numbered physical seats stay on the ring; each
  // full name connects to its own seat with an ordered, non-crossing line.
  const circleLabels = new Map<number, { x: number; y: number; height: number }>();
  if (circle) {
    const isLeft = (point: typeof geometry.seats[number]) => point.x < 0.5 - 0.0001 || (Math.abs(point.x - 0.5) < 0.0001 && point.y > 0.5);
    for (const left of [true, false]) {
      const column = geometry.seats.filter(point => isLeft(point) === left).sort((a, b) => a.y - b.y);
      const step = (ROOM.height - 16) / Math.max(1, column.length);
      column.forEach((point, index) => circleLabels.set(point.index, { x: left ? 182 : 941, y: ROOM.y + 8 + (index + 0.5) * step, height: Math.min(36, step - 2) }));
    }
  }
  for (const point of geometry.seats) {
    const { x, y } = circle ? { x: PAGE_WIDTH / 2 + (point.left / geometry.width - 0.5) * 520, y: ROOM.y + ROOM.height / 2 + (point.top / geometry.height - 0.5) * 460 } : project(point.left, point.top);
    const id = assignments.get(`${point.row}:${point.col}`);
    const student = id ? students.get(id) : undefined;
    const rawName = student?.name.trim() ?? '';
    const name = options.anonymize && rawName ? `${Array.from(rawName)[0].toUpperCase()}.` : rawName;
    const number = point.index + 1;
    const markerSize = circle ? Math.min(23, 920 / geometry.seats.length) : width;
    chartSeats.push({ row: point.row, col: point.col, number, name, x, y, width: markerSize, height: circle ? markerSize : height });
    const markers = sensitive && student ? [student.academic_level === 'advanced' ? '▲' : student.academic_level === 'below_basic' ? '▼' : '', student.has_mobility_issues ? '♿' : '', student.requires_front_row ? '⭐' : ''].filter(Boolean).join(' ') : '';
    drawing += `<g data-chart-seat="${number}" data-row="${point.row}" data-col="${point.col}"><title>${escapeXml(`${t('print.seat_number', { number })}: ${name || t('print.empty_seat')}`)}</title>`;
    if (circle) {
      const label = circleLabels.get(point.index)!;
      const labelWidth = 234;
      const left = label.x < PAGE_WIDTH / 2;
      drawing += `<path d="M${round(x)} ${round(y)}L${round(left ? label.x + labelWidth / 2 : label.x - labelWidth / 2)} ${round(label.y)}" fill="none" stroke="#c0cdd3" stroke-width="1"/>`;
      drawing += rect(x - markerSize / 2, y - markerSize / 2, markerSize, markerSize, '#e6f6f3', '#7aaca4', 5);
      drawing += fittedText(String(number), x, y, markerSize - 3, markerSize - 2, Math.min(11, markerSize * 0.5), measure);
      drawing += rect(label.x - labelWidth / 2, label.y - label.height / 2, labelWidth, label.height, name ? '#f0fdfa' : '#fafcfd', '#b4c6cd', 5);
      drawing += fittedText(String(number), label.x - labelWidth / 2 + 13, label.y, 22, label.height - 2, 10, measure, 400, '#617886');
      drawing += fittedText(`${name || t('print.empty_seat')}${markers ? ` ${markers}` : ''}`, label.x + 10, label.y, labelWidth - 38, label.height - 4, 15, measure, name ? 600 : 400);
      chartLabels.push({ row: point.row, col: point.col, number, name, x: label.x, y: label.y, width: labelWidth, height: label.height });
    } else {
      drawing += rect(x - width / 2, y - height / 2, width, height, name ? COLORS[point.row % COLORS.length] : '#fafcfd');
      drawing += `<text x="${round(x - width / 2 + 7)}" y="${round(y - height / 2 + 11)}" font-size="${round(Math.min(9, height * 0.22))}" fill="#617886" direction="ltr">${number}</text>`;
      drawing += fittedText(name || t('print.empty_seat'), x, y + 5, width - 16, height - 19 - (markers ? 10 : 0), Math.min(16, height * 0.30), measure, name ? 600 : 400, name ? '#172b3a' : '#7b8e99');
      if (markers) drawing += fittedText(markers, x, y + height / 2 - 7, width - 12, 12, 9, measure, 400);
      chartLabels.push(chartSeats[chartSeats.length - 1]);
    }
    drawing += '</g>';
  }
  for (const cell of geometry.decorations) {
    const { x, y } = project(cell.left, cell.top);
    drawing += rect(x - width / 2, y - height / 2, width, height, '#f1f3f5', '#a9b5bd');
    drawing += fittedText(t(cell.kind === 'desk' ? 'roomPlan.teacher' : 'layout.feature_obstacle'), x, y, width - 16, height - 12, 12, measure, 500, '#526775');
  }
  for (const feature of layout.roomFeatures ?? []) {
    const position = featurePosition(feature.kind, feature.x, feature.y, geometry);
    // A circle's teacher marker uses the same projection as the physical seats.
    // Door/window markers remain on their real wall outside the name callouts.
    const x = circle && feature.kind === 'teacher' ? PAGE_WIDTH / 2 + (position.x - 0.5) * 520 : ROOM.x + position.x * ROOM.width;
    const y = circle && feature.kind === 'teacher' ? ROOM.y + ROOM.height / 2 + (position.y - 0.5) * 460 : ROOM.y + position.y * ROOM.height;
    const wall = featureWall(position);
    const side = feature.kind !== 'teacher' && (wall === 'left' || wall === 'right');
    const w = feature.kind === 'teacher' ? 102 : side ? 22 : 78;
    const h = feature.kind === 'teacher' ? 28 : side ? 78 : 22;
    const fill = feature.kind === 'window' ? '#e4f5fc' : feature.kind === 'door' ? '#f0eafa' : '#fff4da';
    drawing += `<g data-chart-feature="${feature.kind}"${side ? ` transform="rotate(${wall === 'left' ? -90 : 90} ${round(x)} ${round(y)})"` : ''}>`;
    drawing += side ? rect(x - h / 2, y - w / 2, h, w, fill) : rect(x - w / 2, y - h / 2, w, h, fill);
    drawing += fittedText(t(`roomPlan.${feature.kind}`), x, y, (side ? h : w) - 8, side ? w - 4 : h - 4, 11, measure, 600);
    drawing += '</g>';
  }
  if (sensitive) drawing += fittedText(`${t('print.teacher_only')}  ·  ▲ ${t('print.legend_advanced')}  ·  ▼ ${t('print.legend_below_basic')}  ·  ♿ ${t('print.legend_mobility')}  ·  ⭐ ${t('print.legend_front_row')}`, PAGE_WIDTH / 2, 711, ROOM.width, 27, 11, measure, 400);
  drawing += `<path d="M54 730H1069" stroke="#dce5e9"/>`;
  drawing += fittedText(t('print.orientation_hint'), PAGE_WIDTH / 2, 750, ROOM.width - 170, 22, 12, measure, 400, '#526775');
  drawing += '<text x="54" y="755" font-size="14" fill="#397c73" direction="ltr" font-weight="700">SeatAI</text>';
  return { title, seats: chartSeats, labels: chartLabels, unseatedCount, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}" role="img" aria-label="${escapeXml(title)}" font-family="${FONT}">${drawing}</svg>` };
}

export function browserTextMeasure(): TextMeasure {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return approximateMeasure;
  return (text, size) => { context.font = `600 ${size}px ${FONT}`; return context.measureText(text).width; };
}
