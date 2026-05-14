import { useEffect, useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { useStore } from '../../core/store';
import { getDisplayScorePct } from '../../utils/seatingUtils';

interface Props {
  onClose: () => void;
}

export default function PrintView({ onClose }: Props) {
  const result = useStore((s) => s.result);
  const students = useStore((s) => s.students);
  const rows = useStore((s) => s.rows);
  const cols = useStore((s) => s.cols);
  const printRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!result) return null;

  const studentMap = new Map(students.map(s => [s.id, s]));

  // Non-grid layouts (clusters, U-shape, circle) don't fit a row/col table,
  // so we render them with absolute positioning from each seat's
  // normalized x/y instead. Rows + custom-rows still use the table — they
  // both have a clean row structure that prints well.
  const isAbsoluteLayout =
    layoutDef.type === 'clusters' ||
    layoutDef.type === 'u-shape' ||
    layoutDef.type === 'circle';

  // Build grid: rows × cols with student name (or empty)
  const grid: (string | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );

  for (const seat of result.layout.seats) {
    const { row, col } = seat.position;
    if (row < rows && col < cols) {
      if (seat.student_id) {
        const s = studentMap.get(seat.student_id);
        grid[row][col] = s ? s.name : seat.student_id;
      }
    }
  }

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      {/* Modal shell */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 print:hidden">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Seating Chart</h2>
            <p className="text-sm text-gray-500">
              {students.length} students · Score: {getDisplayScorePct(result)}% ·{' '}
              {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              <Printer size={16} />
              Print
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
              <h1 className="text-2xl font-bold">SeatAI — Classroom Seating Chart</h1>
              <p className="text-sm text-gray-500 mt-1">
                {students.length} students · Score: {getDisplayScorePct(result)}% ·{' '}
                {new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Teacher label */}
            <div className="flex justify-center mb-4">
              <div className="px-8 py-1.5 border-2 border-gray-400 rounded text-sm font-semibold text-gray-600 bg-gray-50">
                TEACHER / BOARD
              </div>
            </div>

            {/* Seating chart — absolute positioning for non-grid layouts */}
            {isAbsoluteLayout ? (
              <div
                className="relative mx-auto bg-amber-50/30 border-2 border-amber-200 rounded-2xl"
                style={{ width: 'min(720px, 100%)', aspectRatio: '5 / 4' }}
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
                      }}
                    >
                      {student ? (
                        <>
                          <span className="text-[11px] font-semibold text-gray-800 leading-tight">
                            {student.name}
                          </span>
                          <span className="text-[9px] text-gray-400">
                            {student.academic_level === 'advanced' ? '▲' : student.academic_level === 'below_basic' ? '▼' : ''}
                            {student.has_mobility_issues ? ' ♿' : ''}
                            {student.requires_front_row && !student.has_mobility_issues ? ' ⭐' : ''}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
            <div className="overflow-auto">
              <table className="w-full border-collapse mx-auto" style={{ maxWidth: `${cols * 120}px` }}>
                <tbody>
                  {grid.map((rowSeats, rowIdx) => (
                    <tr key={rowIdx}>
                      {/* Row label */}
                      <td className="text-xs text-gray-400 text-right pr-2 w-6 align-middle">
                        {rowIdx + 1}
                      </td>
                      {rowSeats.map((name, colIdx) => {
                        const student = name
                          ? students.find(s => s.name === name) ?? null
                          : null;
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
                                    {name}
                                  </span>
                                  {student && (
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
              <span>▲ Advanced</span>
              <span>▼ Below basic</span>
              <span>♿ Mobility needs</span>
              <span>⭐ Front row required</span>
              <span className="text-purple-600">Purple border = special needs</span>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="mt-4 p-3 border border-yellow-300 bg-yellow-50 rounded-lg">
                <p className="text-xs font-semibold text-yellow-800 mb-1">Warnings</p>
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-700">• {w}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print-specific CSS */}
      <style>{`
        @media print {
          body > *:not(#print-portal) { display: none !important; }
          #print-portal { display: block !important; }
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
          @page { margin: 1cm; size: landscape; }
        }
      `}</style>
    </div>
  );
}
