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
import { useState, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import SeatCard from './SeatCard';
import AbsoluteLayoutRenderer from './AbsoluteLayoutRenderer';
import RowLayoutRenderer from './RowLayoutRenderer';
import GridControls from './GridControls';
import SeatContextMenu from './SeatContextMenu';
import StudentHoverPopup from './StudentHoverPopup';
import { DragGhost, HeatMapLegend, LazyFallback, StaticLegend } from './gridParts';
import { createEmptyGrid, emptySeatsFromLayout } from './gridHelpers';
import { useGridKeyboardNav } from './useGridKeyboardNav';
import { useSeatingHistory } from '../../hooks/useSeatingHistory';
import { getViolations } from '../../utils/seatingUtils';
import { getConstraintStatus } from '../../core/seatStatus';
import type { Seat, Student, OptimizationResult } from '../../types';

// The timeline is heavy and conditional — only loaded when the user opts in.
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
  const showConstraintBadges = useStore((s) => s.showConstraintBadges);
  const showSeatTags = useStore((s) => s.showSeatTags);
  const constraints = useStore((s) => s.constraints);
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

  // In the free-positioning layouts the seats sit on a fixed-size room, so a
  // large class (e.g. a 30-seat circle) would otherwise pack the cards on top
  // of each other. Shrink each card as the seat count grows so they keep their
  // spacing. Floored so cards stay tappable/readable; the room also scrolls.
  const seatScale = isAbsoluteLayout
    ? Math.max(0.6, Math.min(1, Math.sqrt(18 / Math.max(seats.length, 1))))
    : 1;

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const violations = useMemo(() => result ? getViolations(result, students) : new Set<string>(), [result, students]);

  // Full per-seat constraint status (✓ / ⚠ badges + tooltips). Only computed
  // when the teacher turns the badges on, so it costs nothing by default.
  const constraintStatus = useMemo(
    () =>
      showConstraintBadges && result
        ? getConstraintStatus(result, students, constraints, layoutDef)
        : null,
    [showConstraintBadges, result, students, constraints, layoutDef],
  );

  // Translate a seat's broken-rule reasons into a single tooltip string.
  const constraintTitleFor = useCallback(
    (sk: string): string | undefined => {
      const st = constraintStatus?.get(sk);
      if (!st) return undefined;
      if (!st.violated) return t('seatstatus.ok');
      return st.reasons.map((r) => t(r.key, r.params)).join(' · ');
    },
    [constraintStatus, t],
  );

  // Seat currently hovered as a drop target during a drag — drives the live
  // red/green tinting that previews whether the swap keeps rules satisfied.
  const [overSeatKey, setOverSeatKey] = useState<string | null>(null);

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
    setOverSeatKey(null);
    setSelectedSeat(null);
    setContextMenu(null);
  }, [setSelectedSeat]);

  // Track the hovered drop target so we can preview constraint validity.
  const handleDragOver = useCallback((event: { over: { id: string | number } | null }) => {
    setOverSeatKey(event.over ? (event.over.id as string) : null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragSeatKey(null);
      setOverSeatKey(null);
      if (!over || active.id === over.id) return;
      const src = active.id as string;
      const tgt = over.id as string;
      if (lockedSeats.includes(src) || lockedSeats.includes(tgt)) return;
      swapStudents(src, tgt);
    },
    [lockedSeats, swapStudents]
  );

  // Would swapping the dragged student into `tgtKey` keep every rule for the
  // two affected seats satisfied? Returns 'valid' / 'invalid' (null when we
  // can't tell — no result, or badges off). Recomputed only when the hover
  // target changes, so it's cheap.
  const dropPreview = useMemo<'valid' | 'invalid' | null>(() => {
    if (!showConstraintBadges || !result || !activeDragSeatKey || !overSeatKey) return null;
    if (activeDragSeatKey === overSeatKey) return null;
    // Simulate the swap on a shallow clone and re-check the two seats.
    const sim: OptimizationResult = {
      ...result,
      layout: {
        ...result.layout,
        seats: result.layout.seats.map((s) => ({ ...s, position: { ...s.position } })),
      },
    };
    const [ar, ac] = activeDragSeatKey.split('-').map(Number);
    const [br, bc] = overSeatKey.split('-').map(Number);
    const seatA = sim.layout.seats.find((s) => s.position.row === ar && s.position.col === ac);
    const seatB = sim.layout.seats.find((s) => s.position.row === br && s.position.col === bc);
    if (!seatA || !seatB) return null;
    const tmp = seatA.student_id;
    seatA.student_id = seatB.student_id;
    seatA.is_empty = seatB.student_id === undefined;
    seatB.student_id = tmp;
    seatB.is_empty = tmp === undefined;
    const st = getConstraintStatus(sim, students, constraints, layoutDef);
    const aBad = st.get(activeDragSeatKey)?.violated;
    const bBad = st.get(overSeatKey)?.violated;
    return aBad || bBad ? 'invalid' : 'valid';
  }, [showConstraintBadges, result, activeDragSeatKey, overSeatKey, students, constraints, layoutDef]);

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
  useGridKeyboardNav({
    seats,
    selectedSeatKey,
    setSelectedSeat,
    setDetailsTarget,
    gridContainerRef,
  });

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

  // Shared SeatCard renderer — every layout path (pairs, plain rows, the
  // mixed rows-with-decorations path, and the absolute-positioned room)
  // renders seats identically; only their wrappers differ. Passed down to
  // the layout renderers so SeatCard props stay built in one place.
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
        constraintStatus={
          constraintStatus && seat.student_id
            ? constraintStatus.get(sk)?.violated
              ? 'violated'
              : 'ok'
            : undefined
        }
        constraintTitle={constraintStatus && seat.student_id ? constraintTitleFor(sk) : undefined}
        showTags={showSeatTags}
        dropPreview={sk === overSeatKey ? dropPreview : null}
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

      {/* DnD Context wraps the active layout renderer + drag overlay */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {isAbsoluteLayout ? (
          /* ── Free-positioning renderer for clusters / u-shape / circle ── */
          <AbsoluteLayoutRenderer
            seats={seats}
            rows={rows}
            cols={cols}
            seatScale={seatScale}
            zoomLevel={zoomLevel}
            interactionMode={interactionMode}
            gridContainerRef={gridContainerRef}
            renderSeatCard={renderSeatCard}
            showRelations={showRelations}
            activeSeatKey={selectedSeatKey ?? hoveredSeatKey}
            result={result}
            students={students}
          />
        ) : (
          /* ── Row-based renderer for rows / custom-rows ── */
          <RowLayoutRenderer
            seats={seats}
            cols={cols}
            viewMode={viewMode}
            zoomLevel={zoomLevel}
            interactionMode={interactionMode}
            decorationsByRow={decorationsByRow}
            gridContainerRef={gridContainerRef}
            renderSeatCard={renderSeatCard}
            showRelations={showRelations}
            activeSeatKey={selectedSeatKey ?? hoveredSeatKey}
            result={result}
            students={students}
          />
        )}

        {/* Drag ghost */}
        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {activeDragStudent ? (
            <DragGhost
              student={activeDragStudent}
              variant={isAbsoluteLayout ? 'absolute' : 'rows'}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* The context menu, hover popup, and legends only render for the
          row-based layouts — matching the pre-refactor behavior, where
          they lived inside the row branch. */}
      {!isAbsoluteLayout && (
        <>
          {/* ── Context Menu ── */}
          <SeatContextMenu
            contextMenu={contextMenu}
            lockedSeats={lockedSeats}
            violations={violations}
            onToggleLock={toggleLockSeat}
            onClose={() => setContextMenu(null)}
          />

          {/* ── Student Hover Popup ── */}
          <StudentHoverPopup student={hoveredStudent} onClose={() => setHoveredStudent(null)} />

          {/* Heat map legend */}
          <HeatMapLegend mode={heatMapMode} t={t} />

          {/* Static legend */}
          {heatMapMode === 'none' && <StaticLegend t={t} />}
        </>
      )}
    </div>
  );
}
