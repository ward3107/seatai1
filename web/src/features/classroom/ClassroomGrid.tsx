import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { User, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { useState, useRef, useCallback, useMemo, useEffect, lazy, Suspense, Fragment } from 'react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import SeatCard from './SeatCard';
import RelationshipOverlay from './RelationshipOverlay';
import GridControls from './GridControls';
import StudentHoverPopup from './StudentHoverPopup';
import { FitZoom, DecoTile, HeatMapLegend, LazyFallback } from './gridParts';
import { createEmptyGrid, emptySeatsFromLayout, groupIntoDesks } from './gridHelpers';
import { useSeatingHistory } from '../../hooks/useSeatingHistory';
import { getViolations } from '../../utils/seatingUtils';
import type { Seat, Student } from '../../types';

// Both views are heavy and conditional — only loaded when the user opts in.
const Classroom3D = lazy(() => import('./Classroom3D'));
const OptimizationTimeline = lazy(() => import('./OptimizationTimeline'));

// ─── main component ─────────────────────────────────────────────────────────

export default function ClassroomGrid() {
  const result = useStore((s) => s.result);
  const previousPositions = useStore((s) => s.previousPositions);
  const showMovementDiff = useStore((s) => s.showMovementDiff);
  const rows = useStore((s) => s.rows);
  const cols = useStore((s) => s.cols);
  const layoutDef = useStore((s) => s.layoutDef);
  const students = useStore((s) => s.students);
  const lockedSeats = useStore((s) => s.lockedSeats);
  const heatMapMode = useStore((s) => s.heatMapMode);
  const zoomLevel = useStore((s) => s.zoomLevel);
  const viewMode = useStore((s) => s.viewMode);
  const selectedSeatKey = useStore((s) => s.selectedSeatKey);
  const showRelations = useStore((s) => s.showRelations);
  const showTimeline = useStore((s) => s.showTimeline);
  const setSelectedSeat = useStore((s) => s.setSelectedSeat);
  const setShowRelations = useStore((s) => s.setShowRelations);
  const swapStudents = useStore((s) => s.swapStudents);
  const toggleLockSeat = useStore((s) => s.toggleLockSeat);
  const { t } = useLanguage();

  const [interactionMode, setInteractionMode] = useState<'drag' | 'click'>('drag');
  const [hoveredSeatKey, setHoveredSeatKey] = useState<string | null>(null);
  const [hoveredStudent, setHoveredStudent] = useState<Student | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    seatKey: string;
  } | null>(null);
  const [activeDragSeatKey, setActiveDragSeatKey] = useState<string | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  useSeatingHistory();

  const seats = useMemo(() => {
    if (result?.layout.seats) return result.layout.seats;
    // For a plain rows grid with no reserved cells, the cheap builder is
    // fine. As soon as the teacher reserves desk/obstacle cells we route
    // through the layout generator so the empty state drops those cells too
    // (otherwise a blocked cell would show both an empty seat and a tile).
    if (layoutDef.type === 'rows' && !layoutDef.blockedCells?.length) {
      return createEmptyGrid(rows, cols);
    }
    return emptySeatsFromLayout(layoutDef);
  }, [result, layoutDef, rows, cols]);

  // Desk / obstacle tiles to draw inline in the row renderer, grouped by
  // row. Only the 'rows' layout supports reserved cells.
  const decorationsByRow = useMemo(() => {
    const map = new Map<number, { col: number; kind: 'desk' | 'obstacle' }[]>();
    if (layoutDef.type === 'rows') {
      for (const cell of layoutDef.blockedCells ?? []) {
        if (!map.has(cell.row)) map.set(cell.row, []);
        map.get(cell.row)!.push({ col: cell.col, kind: cell.kind });
      }
    }
    return map;
  }, [layoutDef]);

  // Non-grid layouts (clusters, u-shape, circle) need absolute positioning
  // because their seats aren't on a regular grid. custom-rows still works
  // with the row-based renderer because every seat belongs to a row.
  const isAbsoluteLayout =
    layoutDef.type === 'clusters' ||
    layoutDef.type === 'u-shape' ||
    layoutDef.type === 'circle';

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const violations = useMemo(() => result ? getViolations(result, students) : new Set<string>(), [result, students]);

  // Set of student IDs whose row/col changed between the previous and
  // current optimization run. Only computed when the user has the
  // "show movement" toggle on AND both a current result and a previous
  // baseline exist.
  const movedStudentIds: Set<string> =
    showMovementDiff && result && previousPositions
      ? (() => {
          const moved = new Set<string>();
          for (const [id, pos] of Object.entries(result.student_positions)) {
            const prev = previousPositions[id];
            if (!prev) continue; // student is new in this run
            if (prev.row !== pos.row || prev.col !== pos.col) moved.add(id);
          }
          return moved;
        })()
      : new Set<string>();

  // ── DnD sensors ──────────────────────────────────────────────────────────
  // KeyboardSensor gives keyboard-only users a way to swap students:
  // Tab to a seat, Space to pick up, Arrow keys to move, Space to drop
  // (Escape cancels). dnd-kit announces each step via its built-in
  // live region.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // Build a screen-reader-friendly label for each seat. Parent owns it
  // because only the parent has access to the user's language.
  const seatAriaLabel = useCallback(
    (seat: Seat, student: Student | null, isLocked: boolean): string => {
      const rowCol = `${t('a11y.seat_row')} ${seat.position.row + 1}, ${t('a11y.seat_col')} ${seat.position.col + 1}`;
      const occupant = student ? student.name : t('a11y.seat_empty');
      const locked = isLocked ? `, ${t('a11y.seat_locked')}` : '';
      return `${rowCol}, ${occupant}${locked}`;
    },
    [t],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragSeatKey(event.active.id as string);
    setSelectedSeat(null);
    setContextMenu(null);
  }, [setSelectedSeat]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragSeatKey(null);
      if (!over || active.id === over.id) return;
      const src = active.id as string;
      const tgt = over.id as string;
      if (lockedSeats.includes(src) || lockedSeats.includes(tgt)) return;
      swapStudents(src, tgt);
    },
    [lockedSeats, swapStudents]
  );

  const setDetailsTarget = useStore((s) => s.setDetailsTarget);

  // ── Click handlers ────────────────────────────────────────────────────────
  // - In CLICK mode: select-then-swap (existing behavior).
  // - In DRAG mode: opening the detail drawer is the natural click
  //   action (no drag in flight = the user wants to inspect).
  const handleSeatClick = useCallback(
    (seatKey: string) => {
      setContextMenu(null);

      // Resolve the seat regardless of mode — used by both branches below.
      const [row, col] = seatKey.split('-').map(Number);
      const seat = seats.find(
        (s) => s.position.row === row && s.position.col === col
      );

      if (interactionMode === 'drag') {
        // In drag mode, a plain click on an occupied seat = "tell me
        // about this student". Empty seats do nothing.
        if (seat?.student_id) setDetailsTarget(seat.student_id);
        return;
      }

      // Click-to-swap mode (existing behavior).
      if (selectedSeatKey === seatKey) {
        setSelectedSeat(null);
        return;
      }

      if (selectedSeatKey) {
        if (!lockedSeats.includes(selectedSeatKey) && !lockedSeats.includes(seatKey)) {
          swapStudents(selectedSeatKey, seatKey);
        }
        setSelectedSeat(null);
      } else {
        if (seat?.student_id) setSelectedSeat(seatKey);
      }
    },
    [interactionMode, selectedSeatKey, lockedSeats, swapStudents, seats, setSelectedSeat, setDetailsTarget]
  );

  // ── Context menu ──────────────────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent, seatKey: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, seatKey });
  }, []);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  // Arrow keys move the selected seat (or pick the top-left seat if
  // nothing is selected yet). Enter opens the detail drawer for the
  // student in the selected seat. Escape clears the selection.
  // Disabled when focus is in a text input so we don't fight typing.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable
      ) return;

      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(e.key)) return;

      if (e.key === 'Escape') {
        if (selectedSeatKey) {
          e.preventDefault();
          setSelectedSeat(null);
        }
        return;
      }

      // Find current row/col, or default to (0,0).
      let row = 0, col = 0;
      if (selectedSeatKey) {
        const [r, c] = selectedSeatKey.split('-').map(Number);
        row = r;
        col = c;
      }

      if (e.key === 'Enter') {
        const seat = seats.find(
          (s) => s.position.row === row && s.position.col === col,
        );
        if (seat?.student_id) {
          e.preventDefault();
          setDetailsTarget(seat.student_id);
        }
        return;
      }

      // Arrow keys: find the closest occupied seat in the requested
      // direction. Works for rectangular AND non-grid layouts because
      // we search by candidates that exist in `seats`.
      const dr = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      const dc = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      if (dr === 0 && dc === 0) return;

      e.preventDefault();

      // Start from current position and walk until we find an existing
      // seat or run out of rows/cols (3 attempts is enough for normal
      // grids; for irregular layouts we try harder).
      let nextSeat: Seat | undefined;
      for (let step = 1; step < 20 && !nextSeat; step++) {
        nextSeat = seats.find(
          (s) =>
            s.position.row === row + dr * step &&
            s.position.col === col + dc * step,
        );
      }
      // Fallback: if no seat in that exact line (common in non-grid
      // layouts), jump to the seat with the closest row/col in that
      // half-plane.
      if (!nextSeat) {
        const candidates = seats.filter((s) =>
          dr !== 0
            ? Math.sign(s.position.row - row) === dr
            : Math.sign(s.position.col - col) === dc,
        );
        if (candidates.length > 0) {
          nextSeat = candidates.reduce((closest, s) => {
            const d = Math.hypot(
              s.position.row - row,
              s.position.col - col,
            );
            const dCl = Math.hypot(
              closest.position.row - row,
              closest.position.col - col,
            );
            return d < dCl ? s : closest;
          });
        }
      }

      if (nextSeat) {
        setSelectedSeat(`${nextSeat.position.row}-${nextSeat.position.col}`);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedSeatKey, seats, setSelectedSeat, setDetailsTarget]);

  // ── Active drag ghost ─────────────────────────────────────────────────────
  const activeDragStudent = activeDragSeatKey
    ? (() => {
        const [row, col] = activeDragSeatKey.split('-').map(Number);
        const seat = seats.find(
          (s: Seat) => s.position.row === row && s.position.col === col
        );
        return seat?.student_id ? (studentMap.get(seat.student_id) ?? null) : null;
      })()
    : null;

  // Shared SeatCard renderer — the three row layouts (pairs, plain rows,
  // and the mixed rows-with-decorations path) all render seats identically;
  // only their wrappers differ.
  const renderSeatCard = (seat: Seat) => {
    const sk = `${seat.position.row}-${seat.position.col}`;
    const student = seat.student_id ? (studentMap.get(seat.student_id) ?? null) : null;
    return (
      <SeatCard
        seat={seat}
        student={student}
        seatKey={sk}
        isLocked={lockedSeats.includes(sk)}
        isSelected={selectedSeatKey === sk}
        isViolated={violations.has(sk)}
        isMoved={!!seat.student_id && movedStudentIds.has(seat.student_id)}
        heatMapMode={heatMapMode}
        interactionMode={interactionMode}
        ariaLabel={seatAriaLabel(seat, student, lockedSeats.includes(sk))}
        onSeatClick={handleSeatClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => {
          setHoveredSeatKey(sk);
          if (student) setHoveredStudent(student);
        }}
        onMouseLeave={() => {
          setHoveredSeatKey(null);
          setHoveredStudent(null);
        }}
      />
    );
  };

  // ── Build row groups ──────────────────────────────────────────────────────
  const rowMap = new Map<number, Seat[]>();
  for (const seat of seats as Seat[]) {
    if (!rowMap.has(seat.position.row)) rowMap.set(seat.position.row, []);
    rowMap.get(seat.position.row)!.push(seat);
  }
  const sortedRows = Array.from(rowMap.entries()).sort(([a], [b]) => a - b);

  return (
    <div
      className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-3 sm:p-6"
      onClick={() => setContextMenu(null)}
    >
      {/* Toolbar */}
      <GridControls
        interactionMode={interactionMode}
        setInteractionMode={setInteractionMode}
        showRelations={showRelations}
        setShowRelations={setShowRelations}
      />

      {/* Timeline Panel */}
      {showTimeline && (
        <div className="mb-4">
          <Suspense fallback={<LazyFallback />}>
            <OptimizationTimeline />
          </Suspense>
        </div>
      )}

      {/* 3D View */}
      {viewMode === '3d' ? (
        <Suspense fallback={<LazyFallback />}>
          <Classroom3D
            seats={seats}
            students={students}
            rows={rows}
            cols={cols}
            onStudentClick={(studentId: string) => setDetailsTarget(studentId)}
          />
        </Suspense>
      ) : isAbsoluteLayout ? (
        /* ── Free-positioning renderer for clusters / u-shape / circle ── */
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

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
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
                  width: 'min(820px, 100%)',
                  aspectRatio: '5 / 4',
                }}
              >
                {seats.map((seat) => {
                  const sk = `${seat.position.row}-${seat.position.col}`;
                  const student = seat.student_id
                    ? (studentMap.get(seat.student_id) ?? null)
                    : null;
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
                        transform: 'translate(-50%, -50%)',
                      }}
                      onMouseEnter={() => {
                        setHoveredSeatKey(sk);
                        if (student) setHoveredStudent(student);
                      }}
                      onMouseLeave={() => {
                        setHoveredSeatKey(null);
                        setHoveredStudent(null);
                      }}
                    >
                      <SeatCard
                        seat={seat}
                        student={student}
                        seatKey={sk}
                        isLocked={lockedSeats.includes(sk)}
                        isSelected={selectedSeatKey === sk}
                        isViolated={violations.has(sk)}
                        isMoved={!!seat.student_id && movedStudentIds.has(seat.student_id)}
                        heatMapMode={heatMapMode}
                        interactionMode={interactionMode}
                        ariaLabel={seatAriaLabel(seat, student, lockedSeats.includes(sk))}
                        onSeatClick={handleSeatClick}
                        onContextMenu={handleContextMenu}
                        onMouseEnter={() => {
                          setHoveredSeatKey(sk);
                          if (student) setHoveredStudent(student);
                        }}
                        onMouseLeave={() => {
                          setHoveredSeatKey(null);
                          setHoveredStudent(null);
                        }}
                      />
                    </div>
                  );
                })}

                {showRelations && (
                  <RelationshipOverlay
                    activeSeatKey={selectedSeatKey ?? hoveredSeatKey}
                    result={result}
                    students={students}
                    containerRef={gridContainerRef}
                  />
                )}
              </div>
            </div>

            <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
              {activeDragStudent ? (
                <div
                  className={clsx(
                    'w-[88px] min-h-[88px] rounded-lg p-2 flex flex-col items-center justify-center text-white font-bold shadow-2xl scale-105',
                    activeDragStudent.gender === 'male'
                      ? 'bg-blue-400'
                      : activeDragStudent.gender === 'female'
                        ? 'bg-pink-400'
                        : 'bg-purple-400',
                  )}
                >
                  <div className="text-xl">
                    {activeDragStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-xs mt-0.5 truncate w-full text-center">
                    {activeDragStudent.name.split(' ')[0]}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      ) : (
        <>
      {/* Teacher Desk */}
      <div className="flex justify-center mb-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-12 py-3 bg-gradient-to-r from-amber-400 to-orange-400 rounded-lg shadow-lg"
        >
          <span className="font-semibold text-white flex items-center gap-2">
            <User size={18} />
            {t('classroom.teacher_desk')}
          </span>
        </motion.div>
      </div>

      {/* Instruction hint */}
      <p className="text-center text-xs text-gray-400 mb-5">
        {interactionMode === 'drag'
          ? t('classroom.drag_hint')
          : t('classroom.click_hint')}
      </p>

      {/* DnD Context wraps grid + drag overlay */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Zoomable grid wrapper — auto-fits to width, then the user's zoom
            multiplies on top, so the whole class is visible by default
            (especially on phones) instead of clipping the last column. */}
        <FitZoom zoom={zoomLevel}>
          <div ref={gridContainerRef} id="seating-grid-export" className="relative">
            <div className="flex flex-col gap-3">
              {sortedRows.map(([rowIndex, rowSeats]) => {
                const sortedSeats = [...rowSeats].sort(
                  (a, b) => a.position.col - b.position.col
                );
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
                      isPairs && !hasDecos ? 'gap-6' : 'gap-2'
                    )}
                  >
                    {/* Row number label */}
                    <span className="text-[10px] text-gray-400 font-medium self-center w-8 text-right shrink-0">
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
                                ? 'border-blue-200 bg-blue-50'
                                : 'border-amber-200 bg-amber-50'
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
                activeSeatKey={selectedSeatKey ?? hoveredSeatKey}
                result={result}
                students={students}
                containerRef={gridContainerRef}
              />
            )}
          </div>
        </FitZoom>

        {/* Drag ghost */}
        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {activeDragStudent ? (
            <div
              className={clsx(
                'w-[88px] h-[88px] rounded-lg border-2 border-indigo-400 bg-white shadow-2xl',
                'flex flex-col items-center justify-center opacity-95 rotate-2 scale-110'
              )}
            >
              <div
                className={clsx(
                  'w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm',
                  activeDragStudent.gender === 'male'
                    ? 'bg-blue-400'
                    : activeDragStudent.gender === 'female'
                    ? 'bg-pink-400'
                    : 'bg-purple-400'
                )}
              >
                {activeDragStudent.name.charAt(0).toUpperCase()}
              </div>
              <p className="mt-1 text-xs font-medium text-gray-700 truncate max-w-[76px] text-center">
                {activeDragStudent.name.split(' ')[0]}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ── Context Menu ── */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            key="ctx"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 min-w-[190px] max-w-[calc(100vw-1rem)]"
            // Clamp to the viewport so a long-press near a screen edge (common
            // on phones) doesn't open the menu off-screen.
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 120),
              left: Math.min(contextMenu.x, window.innerWidth - 206),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
              onClick={() => {
                toggleLockSeat(contextMenu.seatKey);
                setContextMenu(null);
              }}
            >
              {lockedSeats.includes(contextMenu.seatKey) ? (
                <>🔓 <span>{t('classroom.unlock_seat')}</span></>
              ) : (
                <>🔒 <span>{t('classroom.lock_seat')}</span></>
              )}
            </button>
            {violations.has(contextMenu.seatKey) && (
              <div className="px-4 py-2 text-xs text-red-500 flex items-center gap-2 border-t border-gray-100 mt-1">
                <AlertTriangle size={12} />
                {t('classroom.constraint_violation')}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Student Hover Popup ── */}
      <StudentHoverPopup student={hoveredStudent} onClose={() => setHoveredStudent(null)} />

      {/* Heat map legend */}
      <HeatMapLegend mode={heatMapMode} t={t} />

      {/* Static legend */}
      {heatMapMode === 'none' && (
        <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-blue-50 border-2 border-blue-200" />
            {t('classroom.legend_front_row')}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-400" />
            {t('classroom.legend_male')}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-pink-400" />
            {t('classroom.legend_female')}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-red-100 border-2 border-red-400" />
            {t('classroom.legend_violation')}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">🔒</span>
            {t('classroom.legend_locked')}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
