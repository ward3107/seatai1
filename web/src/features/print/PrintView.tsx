import { useEffect, useRef, useState } from 'react';
import { X, Printer } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { getDisplayScorePct } from '../../utils/seatingUtils';

interface Props {
  onClose: () => void;
}

/** First initial + period — keeps the chart layout-recognisable while
 *  hiding student identities. "Alice Smith" → "A.". */
function toInitials(name: string): string {
  const first = name.trim().charAt(0);
  return first ? `${first.toUpperCase()}.` : '?';
}

export default function PrintView({ onClose }: Props) {
  const result = useStore((s) => s.result);
  const students = useStore((s) => s.students);
  const rows = useStore((s) => s.rows);
  const cols = useStore((s) => s.cols);
  const layoutDef = useStore((s) => s.layoutDef);
  const printRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Privacy-friendly mode for sharing the chart with substitutes,
  // volunteers, or parents — replaces every name with a first-initial.
  const [anonymize, setAnonymize] = useState(false);
  const displayName = (name: string) => (anonymize ? toInitials(name) : name);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Force light colours for the printout regardless of the active theme: the
  // global dark-mode CSS remaps white surfaces to slate, which would print a
  // dark/black chart. Strip the `dark` class while the browser is printing,
  // then restore it. Uses before/afterprint so it also covers "Save as PDF".
  useEffect(() => {
    const root = document.documentElement;
    const before = () => {
      if (root.classList.contains('dark')) {
        root.classList.remove('dark');
        root.dataset.restoreDark = '1';
      }
    };
    const after = () => {
      if (root.dataset.restoreDark === '1') {
        root.classList.add('dark');
        delete root.dataset.restoreDark;
      }
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
      after(); // restore if unmounted mid-print
    };
  }, []);

  if (!result) return null;

  const studentMap = new Map(students.map(s => [s.id, s]));

  // Reserved desk/obstacle cells (rows layout only) so the printed table
  // shows them instead of a misleading empty seat.
  const blockedAt = new Map<string, 'desk' | 'obstacle'>();
  if (layoutDef.type === 'rows') {
    for (const c of layoutDef.blockedCells ?? []) {
      blockedAt.set(`${c.row}|${c.col}`, c.kind);
    }
  }

  // Non-grid layouts (clusters, U-shape, circle) don't fit a row/col table,
  // so we render them with absolute positioning from each seat's
  // normalized x/y instead. Rows + custom-rows still use the table — they
  // both have a clean row structure that prints well.
  const isAbsoluteLayout =
    layoutDef.type === 'clusters' ||
    layoutDef.type === 'u-shape' ||
    layoutDef.type === 'circle';

  // Shrink seat tiles as the class grows so a large circle/cluster doesn't
  // overlap on the printed page (matches the on-screen grid behaviour).
  const seatScale = isAbsoluteLayout
    ? Math.max(0.6, Math.min(1, Math.sqrt(18 / Math.max(result.layout.seats.length, 1))))
    : 1;

  // Build the grid from the actual seat extents, not state rows/cols: a
  // custom-rows layout can have a row wider than `cols`, and sizing by `cols`
  // would silently drop the overflow seats from the printout. Store each
  // seat's student_id (not its name) so badges resolve by id — two students
  // sharing a name must not collide.
  let maxRow = rows - 1;
  let maxCol = cols - 1;
  for (const seat of result.layout.seats) {
    maxRow = Math.max(maxRow, seat.position.row);
    maxCol = Math.max(maxCol, seat.position.col);
  }
  for (const key of blockedAt.keys()) {
    const [r, c] = key.split('|').map(Number);
    maxRow = Math.max(maxRow, r);
    maxCol = Math.max(maxCol, c);
  }
  const gridRows = maxRow + 1;
  const gridCols = maxCol + 1;

  const grid: (string | null)[][] = Array.from({ length: gridRows }, () =>
    Array(gridCols).fill(null),
  );
  for (const seat of result.layout.seats) {
    if (seat.student_id) grid[seat.position.row][seat.position.col] = seat.student_id;
  }

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      {/* Modal shell */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 print:hidden">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{t('print.title')}</h2>
            <p className="text-sm text-gray-500">
              {students.length} {t('app.students')} · {t('app.score')}: {getDisplayScorePct(result)}% ·{' '}
              {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer px-2 py-1 rounded hover:bg-gray-50">
              <input
                type="checkbox"
                checked={anonymize}
                onChange={(e) => setAnonymize(e.target.checked)}
                className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              {t('print.anonymize')}
            </label>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              <Printer size={16} />
              {t('print.print_button')}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Printable chart */}
        <div className="flex-1 overflow-auto p-6" ref={printRef}>
          <div id="print-content">
            {/* Print header (shown only when printing) */}
            <div className="hidden print:block mb-6 text-center">
              <h1 className="text-2xl font-bold">{t('print.chart_title')}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {students.length} {t('app.students')} · {t('app.score')}: {getDisplayScorePct(result)}% ·{' '}
                {new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Teacher label */}
            <div className="flex justify-center mb-4">
              <div className="px-8 py-1.5 border-2 border-gray-400 rounded text-sm font-semibold text-gray-600 bg-gray-50">
                {t('print.teacher_board')}
              </div>
            </div>

            {/* Seating chart — absolute positioning for non-grid layouts */}
            {isAbsoluteLayout ? (
              <div className="overflow-x-auto">
              <div
                className="relative mx-auto bg-amber-50/30 border-2 border-amber-200 rounded-2xl"
                style={{ width: 'clamp(640px, 100%, 720px)', aspectRatio: '5 / 4' }}
              >
                {result.layout.seats.map((seat) => {
                  const student = seat.student_id
                    ? (studentMap.get(seat.student_id) ?? null)
                    : null;
                  const px = typeof seat.position.x === 'number'
                    ? seat.position.x
                    : cols > 1 ? seat.position.col / (cols - 1) : 0.5;
                  const py = typeof seat.position.y === 'number'
                    ? seat.position.y
                    : rows > 1 ? seat.position.row / (rows - 1) : 0.5;
                  const hasNeeds = student && (
                    student.has_mobility_issues ||
                    student.requires_front_row ||
                    student.special_needs.length > 0
                  );
                  return (
                    <div
                      key={`${seat.position.row}-${seat.position.col}`}
                      className={`
                        absolute border-2 rounded-lg p-1.5 text-center min-h-[48px] w-[80px]
                        flex flex-col items-center justify-center
                        ${student
                          ? hasNeeds
                            ? 'border-purple-300 bg-purple-50'
                            : 'border-gray-300 bg-white'
                          : 'border-dashed border-gray-200 bg-gray-50'
                        }
                      `}
                      style={{
                        left: `calc(${6 + px * 88}% - 40px)`,
                        top: `calc(${6 + py * 88}% - 24px)`,
                        transform: `scale(${seatScale})`,
                      }}
                    >
                      {student ? (
                        <>
                          <span className="text-[11px] font-semibold text-gray-800 leading-tight">
                            {displayName(student.name)}
                          </span>
                          {!anonymize && (
                            <span className="text-[9px] text-gray-400">
                              {student.academic_level === 'advanced' ? '▲' : student.academic_level === 'below_basic' ? '▼' : ''}
                              {student.has_mobility_issues ? ' ♿' : ''}
                              {student.requires_front_row && !student.has_mobility_issues ? ' ⭐' : ''}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
            ) : (
            <div className="overflow-auto">
              <table className="w-full border-collapse mx-auto" style={{ maxWidth: `${gridCols * 120}px` }}>
                <tbody>
                  {grid.map((rowSeats, rowIdx) => (
                    <tr key={rowIdx}>
                      {/* Row label */}
                      <td className="text-xs text-gray-400 text-right pr-2 w-6 align-middle">
                        {rowIdx + 1}
                      </td>
                      {rowSeats.map((sid, colIdx) => {
                        const blockedKind = blockedAt.get(`${rowIdx}|${colIdx}`);
                        if (blockedKind) {
                          return (
                            <td key={colIdx} className="p-1">
                              <div
                                className={`border-2 rounded-lg p-2 text-center min-h-[56px] flex items-center justify-center text-[10px] font-semibold ${
                                  blockedKind === 'desk'
                                    ? 'border-amber-300 bg-amber-50 text-amber-700'
                                    : 'border-gray-300 bg-gray-100 text-gray-500'
                                }`}
                              >
                                {blockedKind === 'desk' ? t('print.teacher_short') : '✕'}
                              </div>
                            </td>
                          );
                        }
                        // Resolve by id (not name) so duplicate names don't
                        // borrow each other's badges. Fall back to the raw id
                        // if the student was removed.
                        const student = sid ? studentMap.get(sid) ?? null : null;
                        const name = student ? student.name : sid;
                        const hasNeeds = student && (
                          student.has_mobility_issues ||
                          student.requires_front_row ||
                          student.special_needs.length > 0
                        );
                        return (
                          <td key={colIdx} className="p-1">
                            <div
                              className={`
                                border-2 rounded-lg p-2 text-center min-h-[56px] flex flex-col
                                items-center justify-center gap-0.5
                                ${name
                                  ? hasNeeds
                                    ? 'border-purple-300 bg-purple-50'
                                    : 'border-gray-300 bg-white'
                                  : 'border-dashed border-gray-200 bg-gray-50'
                                }
                              `}
                            >
                              {name ? (
                                <>
                                  <span className="text-xs font-semibold text-gray-800 leading-tight text-center">
                                    {displayName(name)}
                                  </span>
                                  {student && !anonymize && (
                                    <span className="text-[10px] text-gray-400">
                                      {student.academic_level === 'advanced' ? '▲'
                                        : student.academic_level === 'below_basic' ? '▼'
                                        : ''}
                                      {student.has_mobility_issues ? ' ♿' : ''}
                                      {student.requires_front_row && !student.has_mobility_issues ? ' ⭐' : ''}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-4 justify-center text-xs text-gray-500">
              {!anonymize && (
                <>
                  <span>▲ {t('print.legend_advanced')}</span>
                  <span>▼ {t('print.legend_below_basic')}</span>
                  <span>♿ {t('print.legend_mobility')}</span>
                  <span>⭐ {t('print.legend_front_row')}</span>
                </>
              )}
              <span className="text-purple-600">{t('print.legend_special_needs')}</span>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="mt-4 p-3 border border-yellow-300 bg-yellow-50 rounded-lg">
                <p className="text-xs font-semibold text-yellow-800 mb-1">{t('print.warnings')}</p>
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-700">• {w}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print-specific CSS.
          The chart lives in a modal nested inside #root (not a body-level
          portal), so we can't hide by `body > *`. Instead hide everything
          with `visibility`, then reveal only #print-content and pin it to the
          page's top-left. Backgrounds are forced white (and the `dark` class
          is stripped for the print via the effect above) so the chart never
          prints on a dark/black page. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-content, #print-content * { visibility: visible !important; }
          #print-content {
            position: absolute !important;
            left: 0; top: 0; width: 100%;
            background: #fff !important;
          }
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
          @page { margin: 1cm; size: landscape; }
        }
      `}</style>
    </div>
  );
}
