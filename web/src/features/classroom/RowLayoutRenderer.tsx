import { useStore } from '../../core/store';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import clsx from 'clsx';
import { Fragment, useMemo, type ReactElement, type RefObject } from 'react';
import RelationshipOverlay from './RelationshipOverlay';
import { FitZoom, DecoTile } from './gridParts';
import { groupIntoDesks } from './gridHelpers';
import { useLanguage } from '../../hooks/useLanguage';
import type { ViewMode } from '../../core/store';
import type { Seat, Student, OptimizationResult } from '../../types';

interface Props {
  seats: Seat[];
  cols: number;
  viewMode: ViewMode;
  zoomLevel: number;
  interactionMode: 'details' | 'drag' | 'click';
  /** Desk / obstacle tiles to draw inline, grouped by row. */
  decorationsByRow: Map<number, { col: number; kind: 'desk' | 'obstacle' }[]>;
  gridContainerRef: RefObject<HTMLDivElement>;
  /** Shared SeatCard renderer owned by the orchestrator (ClassroomGrid). */
  renderSeatCard: (seat: Seat) => ReactElement;
  showRelations: boolean;
  /** Selected (or hovered) seat driving the relationship overlay. */
  activeSeatKey: string | null;
  result: OptimizationResult | null;
  students: Student[];
}

/**
 * Row-based renderer for the `rows` and `custom-rows` layouts (every seat
 * belongs to a logical row). Handles the plain-rows, pairs, and
 * rows-with-reserved-cells variants. Must be rendered inside the
 * orchestrator's DndContext so seat drag-and-drop keeps working.
 */
export default function RowLayoutRenderer({
  seats,
  cols,
  viewMode,
  zoomLevel,
  decorationsByRow,
  gridContainerRef,
  renderSeatCard,
  showRelations,
  activeSeatKey,
  result,
  students,
}: Props) {
  const { t } = useLanguage();
  const hasRoomPlan = useStore(s => s.layoutDef.roomFeatures !== undefined);

  // ── Build row groups ──────────────────────────────────────────────────────
  // Memoized on `seats`: the parent re-renders on every seat hover, and this
  // grouping + per-row column sort is otherwise redundant O(n log n) work each
  // time. Rows are sorted front-to-back and each row's seats left-to-right.
  const sortedRows = useMemo(() => {
    const rowMap = new Map<number, Seat[]>();
    for (const seat of seats) {
      if (!rowMap.has(seat.position.row)) rowMap.set(seat.position.row, []);
      rowMap.get(seat.position.row)!.push(seat);
    }
    return Array.from(rowMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([rowIndex, rowSeats]) => [
        rowIndex,
        [...rowSeats].sort((a, b) => a.position.col - b.position.col),
      ] as [number, Seat[]]);
  }, [seats]);

  return (
    <>
      {/* Teacher Desk */}
      <div hidden={hasRoomPlan} className={hasRoomPlan ? 'hidden' : 'flex justify-center mb-3'}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-8 py-2 bg-primary-50 dark:bg-primary-900/40 border border-primary-200 dark:border-primary-800 rounded-xl"
        >
          <span className="text-sm font-semibold text-primary-800 dark:text-primary-200 flex items-center gap-2">
            <User size={18} />
            {t('classroom.teacher_desk')}
          </span>
        </motion.div>
      </div>

      {/* Zoomable grid wrapper — auto-fits to width, then the user's zoom
          multiplies on top, so the whole class is visible by default
          (especially on phones) instead of clipping the last column. */}
      <FitZoom zoom={zoomLevel}>
        <div ref={gridContainerRef} dir={hasRoomPlan ? 'ltr' : undefined} id="seating-grid-export" className="relative">
          <div className="flex flex-col gap-3">
            {sortedRows.map(([rowIndex, sortedSeats]) => {
              // `sortedSeats` is already column-sorted by the memo above.
              const isPairs = viewMode === 'pairs';
              const rowDecos = decorationsByRow.get(rowIndex) ?? [];
              const hasDecos = rowDecos.length > 0;
              // Reserved cells break the regular grid, so a row containing
              // any falls back to one col-sorted sequence (no pair grouping).
              const desks = isPairs && !hasDecos ? groupIntoDesks(sortedSeats) : null;

              return (
                <div
                  key={rowIndex}
                  className={clsx(
                    'flex justify-center items-start',
                    isPairs && !hasDecos ? 'gap-4' : 'gap-2'
                  )}
                >
                  {/* Row number label */}
                  <span className="text-[10px] text-gray-400 dark:text-gray-400 font-medium self-center w-8 text-right shrink-0">
                    {rowIndex + 1}
                  </span>

                  {hasDecos
                    ? /* ── Rows with reserved cells: seats + desk/obstacle tiles, col-sorted ── */
                      [
                        ...sortedSeats.map((seat) => ({
                          sortCol: seat.position.col,
                          node: (
                            <motion.div
                              key={`seat-${seat.position.row}-${seat.position.col}`}
                              layout
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            >
                              {renderSeatCard(seat)}
                            </motion.div>
                          ),
                        })),
                        ...rowDecos.map((d) => ({
                          sortCol: d.col,
                          node: (
                            <DecoTile
                              key={`deco-${rowIndex}-${d.col}`}
                              kind={d.kind}
                              label={
                                d.kind === 'desk'
                                  ? t('layout.feature_desk')
                                  : t('layout.feature_obstacle')
                              }
                            />
                          ),
                        })),
                      ]
                        .sort((a, b) => a.sortCol - b.sortCol)
                        .map((item) => item.node)
                    : isPairs && desks
                    ? /* ── Pairs layout: seats grouped in 2-seat desk units ── */
                      desks.map((deskSeats, deskIdx) => (
                        <motion.div
                          key={`desk-${rowIndex}-${deskIdx}`}
                          layout
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 25,
                            delay: result ? (rowIndex * 3 + deskIdx) * 0.015 : 0,
                          }}
                          className={clsx(
                            'flex gap-2 p-2 rounded-xl border-2',
                            rowIndex === 0
                              ? 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30'
                          )}
                        >
                          {deskSeats.map((seat) => (
                            <Fragment key={`${seat.position.row}-${seat.position.col}`}>
                              {renderSeatCard(seat)}
                            </Fragment>
                          ))}
                        </motion.div>
                      ))
                    : /* ── Rows layout: individual seats in a straight row ── */
                      sortedSeats.map((seat, seatIdx) => (
                        <motion.div
                          key={`${seat.position.row}-${seat.position.col}`}
                          layout
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 25,
                            delay: result ? (rowIndex * cols + seatIdx) * 0.012 : 0,
                          }}
                        >
                          {renderSeatCard(seat)}
                        </motion.div>
                      ))}

                  {/* Spacer to balance row label */}
                  <span className="w-8 shrink-0" />
                </div>
              );
            })}
          </div>

          {/* SVG relationship overlay */}
          {showRelations && (
            <RelationshipOverlay
              activeSeatKey={activeSeatKey}
              result={result}
              students={students}
              containerRef={gridContainerRef}
            />
          )}
        </div>
      </FitZoom>
    </>
  );
}
