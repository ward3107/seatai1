import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import type { ReactElement, RefObject } from 'react';
import RelationshipOverlay from './RelationshipOverlay';
import { useLanguage } from '../../hooks/useLanguage';
import type { Seat, Student, OptimizationResult } from '../../types';

interface Props {
  seats: Seat[];
  rows: number;
  cols: number;
  /** Per-card scale so large classes keep their spacing in the fixed room. */
  seatScale: number;
  zoomLevel: number;
  interactionMode: 'drag' | 'click';
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
 * Free-positioning renderer for clusters / u-shape / circle layouts.
 * Seats aren't on a regular grid, so each card is absolutely positioned
 * from its normalized (x, y) room coordinates. Must be rendered inside
 * the orchestrator's DndContext so seat drag-and-drop keeps working.
 */
export default function AbsoluteLayoutRenderer({
  seats,
  rows,
  cols,
  seatScale,
  zoomLevel,
  interactionMode,
  gridContainerRef,
  renderSeatCard,
  showRelations,
  activeSeatKey,
  result,
  students,
}: Props) {
  const { t } = useLanguage();

  return (
    <>
      <div className="flex justify-center mb-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-10 py-2.5 bg-gradient-to-r from-amber-400 to-orange-400 rounded-lg shadow-lg"
        >
          <span className="font-semibold text-white flex items-center gap-2 text-sm">
            <User size={16} />
            {t('classroom.teacher_desk')}
          </span>
        </motion.div>
      </div>

      <p className="text-center text-xs text-gray-400 mb-4">
        {interactionMode === 'drag'
          ? t('classroom.drag_hint')
          : t('classroom.click_hint')}
      </p>

      {/* Horizontal scroll wrapper: on narrow screens the room keeps a
          usable minimum width and scrolls, instead of collapsing so the
          seats stack on top of each other (clusters / U-shape / circle). */}
      <div className="overflow-x-auto pb-2">
      <div
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top center',
          transition: 'transform 0.2s ease',
        }}
      >
        <div
          ref={gridContainerRef}
          id="seating-grid-export"
          className="relative mx-auto bg-amber-50/30 border-2 border-amber-200 rounded-2xl"
          style={{
            // Aspect ratio close to a classroom — wider than tall.
            // Floored so seats keep breathing room on phones (scrolls).
            width: 'clamp(700px, 100%, 820px)',
            aspectRatio: '5 / 4',
          }}
        >
          {seats.map((seat) => {
            const sk = `${seat.position.row}-${seat.position.col}`;
            // Fall back to a row/col grid position if the optimizer
            // returned a result built before this rendering path
            // existed (e.g. persisted projects from earlier versions).
            const px =
              typeof seat.position.x === 'number'
                ? seat.position.x
                : cols > 1
                  ? seat.position.col / (cols - 1)
                  : 0.5;
            const py =
              typeof seat.position.y === 'number'
                ? seat.position.y
                : rows > 1
                  ? seat.position.row / (rows - 1)
                  : 0.5;
            // Inset so seats aren't clipped against the room walls.
            const left = 6 + px * 88;
            const top = 6 + py * 88;

            return (
              <div
                key={sk}
                className="absolute"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: '88px',
                  transform: `translate(-50%, -50%) scale(${seatScale})`,
                }}
              >
                {/* Hover handlers live on SeatCard itself — duplicating
                    them on this wrapper double-fired the state updates. */}
                {renderSeatCard(seat)}
              </div>
            );
          })}

          {showRelations && (
            <RelationshipOverlay
              activeSeatKey={activeSeatKey}
              result={result}
              students={students}
              containerRef={gridContainerRef}
            />
          )}
        </div>
      </div>
      </div>
    </>
  );
}
