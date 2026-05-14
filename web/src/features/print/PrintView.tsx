import { useEffect, useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { useStore } from '../../core/store';

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
              {students.length} students · Score: {(result.fitness_score * 100).toFixed(1)}% ·{' '}
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
                {students.length} students · Score: {(result.fitness_score * 100).toFixed(1)}% ·{' '}
                {new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Teacher label */}
            <div className="flex justify-center mb-4">
              <div className="px-8 py-1.5 border-2 border-gray-400 rounded text-sm font-semibold text-gray-600 bg-gray-50">
                TEACHER / BOARD
              </div>
            </div>

            {/* Grid */}
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
