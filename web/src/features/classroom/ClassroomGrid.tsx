import RoomLayoutRenderer from './RoomLayoutRenderer';
import { Info, Lock, Unlock, X } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  getClientRect,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useState, useRef, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
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
import { getViolations } from '../../utils/seatingUtils';
import { getConstraintStatus } from '../../core/seatStatus';
import type { Seat, Student, OptimizationResult } from '../../types';

// The timeline is heavy and conditional — only loaded when the user opts in.
const OptimizationTimeline = lazy(() => import('./OptimizationTimeline'));

// Measure the rendered bounds, including FitZoom's parent transform. The
// default transform-agnostic measurement offset the ghost at reduced zoom.
const GRID_MEASURING = { draggable: { measure: getClientRect }, droppable: { measure: getClientRect } };

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

  const [interactionMode, setInteractionMode] = useState<'drag' | 'click'>(() => window.matchMedia('(pointer: coarse)').matches ? 'click' : 'drag');
  const [hoveredSeatKey, setHoveredSeatKey] = useState<string | null>(null);
  const [hoveredStudent, setHoveredStudent] = useState<Student | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<DOMRect | null>(null);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverSuppressedUntil = useRef(0);
  const hoverPointerPosition = useRef({x:0,y:0});
  const keepHoverOpen = useCallback(() => {
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = null;
  }, []);
  const closeHover = useCallback(() => {
    keepHoverOpen();
    setHoveredStudent(null);
    setHoverAnchor(null);
  }, [keepHoverOpen]);
  const leaveHover = useCallback(() => {
    keepHoverOpen();
    // A short bridge lets the pointer reach the adjacent preview controls.
    hoverCloseTimer.current = setTimeout(closeHover, 200);
  }, [keepHoverOpen, closeHover]);
  useEffect(() => keepHoverOpen, [keepHoverOpen]);
  useEffect(() => {
    if (!hoveredStudent) return;
    const dismissOnScroll = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[data-testid="student-hover-popup"]')) return;
      // Some engines synthesize pointer entry as content moves under a
      // stationary mouse. Do not immediately reopen the dismissed preview.
      hoverSuppressedUntil.current = Date.now() + 250;
      if (event instanceof MouseEvent) hoverPointerPosition.current = {x:event.clientX,y:event.clientY};
      closeHover();
    };
    window.addEventListener('scroll', dismissOnScroll, true);
    window.addEventListener('wheel', dismissOnScroll, {capture:true,passive:true});
    window.addEventListener('resize', closeHover);
    return () => {
      window.removeEventListener('scroll', dismissOnScroll, true);
      window.removeEventListener('wheel', dismissOnScroll, true);
      window.removeEventListener('resize', closeHover);
    };
  }, [hoveredStudent, closeHover]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    seatKey: string;
  } | null>(null);
  const [activeDragSeatKey, setActiveDragSeatKey] = useState<string | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const justDraggedRef = useRef(false);
  const [dragSize, setDragSize] = useState({ width: 84, height: 100 });
  useEffect(() => { setSelectedSeat(null); }, [interactionMode, layoutDef, setSelectedSeat]);

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
  const violations = useMemo(() => result ? getViolations(result, students, layoutDef) : new Set<string>(), [result, students, layoutDef]);

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

  // Off-screen live region for keyboard-driven seat actions (lock/unlock). A
  // trailing NBSP alternates each call so the SR re-announces even when the
  // text would otherwise be identical.
  const [liveMessage, setLiveMessage] = useState('');
  const liveCounter = useRef(0);
  const announce = useCallback((msg: string) => {
    liveCounter.current += 1;
    setLiveMessage(msg + ' '.repeat(liveCounter.current % 2));
  }, []);

  // Set of student IDs whose row/col changed between the previous and
  // current optimization run. Only computed when the user has the
  // "show movement" toggle on AND both a current result and a previous
  // baseline exist. Memoized so it doesn't rebuild on every render (e.g.
  // every hover).
  const movedStudentIds = useMemo<Set<string>>(() => {
    if (!(showMovementDiff && result && previousPositions)) return new Set<string>();
    const moved = new Set<string>();
    for (const [id, pos] of Object.entries(result.student_positions)) {
      const prev = previousPositions[id];
      if (!prev) continue; // student is new in this run
      if (prev.row !== pos.row || prev.col !== pos.col) moved.add(id);
    }
    return moved;
  }, [showMovementDiff, result, previousPositions]);

  // seatKey → student, so the hover handlers can resolve the hovered student
  // without a per-seat closure (see the stable handlers below).
  const studentBySeatKey = useMemo(() => {
    const m = new Map<string, Student>();
    for (const seat of seats) {
      if (seat.student_id) {
        const s = studentMap.get(seat.student_id);
        if (s) m.set(`${seat.position.row}-${seat.position.col}`, s);
      }
    }
    return m;
  }, [seats, studentMap]);

  const handleSeatMouseEnter = useCallback(
    (sk: string, x: number, y: number) => {
      const stationary = Math.hypot(x-hoverPointerPosition.current.x,y-hoverPointerPosition.current.y)<2;
      if (activeDragSeatKey || (stationary && Date.now() < hoverSuppressedUntil.current)) return;
      hoverPointerPosition.current = {x,y};
      keepHoverOpen();
      setHoveredSeatKey(sk);
      setHoveredStudent(studentBySeatKey.get(sk) ?? null);
      setHoverAnchor(gridContainerRef.current?.querySelector(`[data-seat-key="${sk}"]`)?.getBoundingClientRect() ?? null);
    },
    [studentBySeatKey, activeDragSeatKey, keepHoverOpen],
  );
  const handleSeatMouseLeave = useCallback(() => {
    setHoveredSeatKey(null);
    leaveHover();
  }, [leaveHover]);

  // ── DnD sensors ──────────────────────────────────────────────────────────
  // Separate mouse/touch sensors avoid competing pointer activation. Keyboard
  // users select and move with native Space/Enter, with arrows for focus.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
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
    closeHover();
    justDraggedRef.current = true;
    const rect = event.active.rect.current.initial;
    if (rect) setDragSize({ width: rect.width, height: rect.height });
    setActiveDragSeatKey(event.active.id as string);
    setOverSeatKey(null);
    setSelectedSeat(null);
    setContextMenu(null);
  }, [setSelectedSeat, closeHover]);

  // Track the hovered drop target so we can preview constraint validity.
  const handleDragOver = useCallback((event: { over: { id: string | number } | null }) => {
    setOverSeatKey(event.over ? (event.over.id as string) : null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragSeatKey(null);
      setOverSeatKey(null);
      // Some browsers emit a click immediately after mouse/touch release.
      // Clear after that event turn so dropping cannot open a drawer/select a seat.
      window.setTimeout(() => { justDraggedRef.current = false; }, 0);
      if (!over || active.id === over.id) { announce(t('classroom.drag_cancelled')); return; }
      const src = active.id as string;
      const tgt = over.id as string;
      if (lockedSeats.includes(src) || lockedSeats.includes(tgt)) return;
      swapStudents(src, tgt);
      const student = studentBySeatKey.get(src);
      if (student) announce(t('workspace.moved', { name: student.name }));
    },
    [lockedSeats, swapStudents, studentBySeatKey, announce, t]
  );

  // Would swapping the dragged student into `tgtKey` keep every rule for the
  // two affected seats satisfied? Returns 'valid' / 'invalid' (null when we
  // can't tell — no result, or badges off). Recomputed only when the hover
  // target changes, so it's cheap.
  // Would swapping `srcKey` into `tgtKey` keep both seats' rules satisfied?
  // Shared by the visual drop preview and the drag announcements so keyboard
  // and pointer users get the exact same verdict.
  const evaluateSwap = useCallback(
    (srcKey: string, tgtKey: string): 'valid' | 'invalid' | null => {
      if (!showConstraintBadges || !result || srcKey === tgtKey) return null;
      const sim: OptimizationResult = {
        ...result,
        layout: {
          ...result.layout,
          seats: result.layout.seats.map((s) => ({ ...s, position: { ...s.position } })),
        },
      };
      const [ar, ac] = srcKey.split('-').map(Number);
      const [br, bc] = tgtKey.split('-').map(Number);
      const seatA = sim.layout.seats.find((s) => s.position.row === ar && s.position.col === ac);
      const seatB = sim.layout.seats.find((s) => s.position.row === br && s.position.col === bc);
      if (!seatA || !seatB) return null;
      const tmp = seatA.student_id;
      seatA.student_id = seatB.student_id;
      seatA.is_empty = seatB.student_id === undefined;
      seatB.student_id = tmp;
      seatB.is_empty = tmp === undefined;
      const st = getConstraintStatus(sim, students, constraints, layoutDef);
      return st.get(srcKey)?.violated || st.get(tgtKey)?.violated ? 'invalid' : 'valid';
    },
    [showConstraintBadges, result, students, constraints, layoutDef],
  );

  const dropPreview = useMemo<'valid' | 'invalid' | null>(() => {
    if (!activeDragSeatKey || !overSeatKey) return null;
    return evaluateSwap(activeDragSeatKey, overSeatKey);
  }, [evaluateSwap, activeDragSeatKey, overSeatKey]);

  // Spoken announcements accompany pointer drag feedback.
  // Critically, the over-target message states whether the swap is allowed or
  // would break a rule — the same verdict the sighted user sees as a green/red
  // ring — so keyboard/SR users aren't relying on color they can't perceive.
  const dndAnnouncements = useMemo(() => {
    const nameOf = (id: string) => {
      const [r, c] = id.split('-').map(Number);
      const seat = seats.find((s) => s.position.row === r && s.position.col === c);
      return seat?.student_id ? (studentMap.get(seat.student_id)?.name ?? '') : '';
    };
    const pos = (id: string) => {
      const [r, c] = id.split('-').map(Number);
      return { row: r + 1, col: c + 1 };
    };
    return {
      onDragStart({ active }: { active: { id: string | number } }) {
        return t('classroom.drag_pickup', { name: nameOf(String(active.id)) });
      },
      onDragOver({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) {
        if (!over) return undefined;
        const p = pos(String(over.id));
        const v = evaluateSwap(String(active.id), String(over.id));
        if (v === 'valid') return t('classroom.drag_over_valid', p);
        if (v === 'invalid') return t('classroom.drag_over_invalid', p);
        return t('classroom.drag_over_plain', p);
      },
      onDragEnd({ over }: { active: { id: string | number }; over: { id: string | number } | null }) {
        if (!over) return t('classroom.drag_cancelled');
        return t('classroom.drag_dropped', pos(String(over.id)));
      },
      onDragCancel() {
        return t('classroom.drag_cancelled');
      },
    };
  }, [seats, studentMap, t, evaluateSwap]);

  const setDetailsTarget = useStore((s) => s.setDetailsTarget);

  // ── Click handlers ────────────────────────────────────────────────────────
  // Select-then-move works in both modes; details have a separate button.
  const handleSeatClick = useCallback(
    (seatKey: string) => {
      closeHover();
      setContextMenu(null);
      setLiveMessage('');

      // Resolve the seat regardless of mode — used by both branches below.
      const [row, col] = seatKey.split('-').map(Number);
      const seat = seats.find(
        (s) => s.position.row === row && s.position.col === col
      );

      if (justDraggedRef.current) return;
      if (lockedSeats.includes(seatKey)) { if (!selectedSeatKey) setSelectedSeat(seatKey); announce(t('workspace.locked')); return; }

      // Click-to-swap mode (existing behavior).
      if (selectedSeatKey === seatKey) {
        setSelectedSeat(null);
        return;
      }

      if (selectedSeatKey) {
        if (!lockedSeats.includes(selectedSeatKey) && !lockedSeats.includes(seatKey)) {
          swapStudents(selectedSeatKey, seatKey);
          const moved = studentBySeatKey.get(selectedSeatKey);
          if (moved) announce(t('workspace.moved', { name: moved.name }));
        }
        else announce(t('workspace.locked'));
        setSelectedSeat(null);
      } else {
        if (seat?.student_id) setSelectedSeat(seatKey);
      }
    },
    [selectedSeatKey, lockedSeats, swapStudents, seats, setSelectedSeat, studentBySeatKey, announce, t, closeHover]
  );

  // ── Context menu ──────────────────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent, seatKey: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, seatKey });
  }, []);

  // Announce a keyboard lock/unlock to assistive tech, naming the occupant.
  const announceLockChange = useCallback(
    (seatKey: string, nowLocked: boolean) => {
      const [r, c] = seatKey.split('-').map(Number);
      const seat = seats.find((s) => s.position.row === r && s.position.col === c);
      const name = seat?.student_id ? (studentMap.get(seat.student_id)?.name ?? '') : '';
      announce(
        t(nowLocked ? 'classroom.seat_locked_announce' : 'classroom.seat_unlocked_announce', { name }),
      );
    },
    [seats, studentMap, announce, t],
  );

  // ── Keyboard navigation ──────────────────────────────────────────────────
  useGridKeyboardNav({
    seats,
    selectedSeatKey,
    setSelectedSeat,
    setDetailsTarget,
    gridContainerRef,
    lockedSeats,
    toggleLockSeat,
    announceLockChange,
    isDragging: !!activeDragSeatKey,
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
        onMouseEnter={handleSeatMouseEnter}
        onMouseLeave={handleSeatMouseLeave}
      />
    );
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-3 sm:p-5"
      onPointerDownCapture={() => { justDraggedRef.current = false; }}
      onKeyDownCapture={() => { justDraggedRef.current = false; }}
      onClick={() => setContextMenu(null)}
    >
      {/* Off-screen live region for keyboard seat lock/unlock announcements. */}
      <div role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      {/* Toolbar */}
      <GridControls
        interactionMode={interactionMode}
        setInteractionMode={setInteractionMode}
        showRelations={showRelations}
        setShowRelations={setShowRelations}
      />

      <div className="mb-3 flex h-20 sm:h-16 items-center justify-between gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 dark:border-primary-800 dark:bg-primary-900/30" data-testid="movement-feedback">
        <p role="status" className="min-w-0 flex-1 line-clamp-3 text-xs sm:text-sm font-medium text-primary-800 dark:text-primary-200">{activeDragStudent ? t('workspace.moving', { name: activeDragStudent.name }) : liveMessage || (selectedSeatKey && studentBySeatKey.get(selectedSeatKey) ? t('workspace.selected', { name: studentBySeatKey.get(selectedSeatKey)!.name }) : t(interactionMode === 'drag' ? 'classroom.drag_hint' : 'classroom.click_hint'))}</p>
        <div className="w-[132px] shrink-0">{selectedSeatKey && <div className="flex items-center gap-1">
          <button type="button" onClick={() => { const student = studentBySeatKey.get(selectedSeatKey); if (student) setDetailsTarget(student.id); }} aria-label={t('workspace.details')} title={t('workspace.details')} className="min-h-11 min-w-11 rounded-lg p-2 text-primary-800 dark:text-primary-200"><Info size={18} /></button>
          <button type="button" onClick={() => { const locked = lockedSeats.includes(selectedSeatKey); toggleLockSeat(selectedSeatKey); announceLockChange(selectedSeatKey, !locked); setSelectedSeat(null); }} aria-label={t(lockedSeats.includes(selectedSeatKey) ? 'workspace.unlock' : 'workspace.lock')} className="min-h-11 min-w-11 rounded-lg p-2 text-primary-800 dark:text-primary-200">{lockedSeats.includes(selectedSeatKey) ? <Unlock size={18} /> : <Lock size={18} />}</button>
          <button type="button" onClick={() => setSelectedSeat(null)} aria-label={t('workspace.cancel_move')} className="min-h-11 min-w-11 rounded-lg p-2 text-primary-800 dark:text-primary-200"><X size={18} /></button>
        </div>}</div>
      </div>

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
        autoScroll={{ threshold: { x: 0.12, y: 0.06 } }}
        measuring={GRID_MEASURING}
        sensors={sensors}
        collisionDetection={(args) => {
          if (!args.pointerCoordinates) return closestCenter(args);
          const { x, y } = args.pointerCoordinates;
          const key = document.elementFromPoint(x, y)?.closest('[data-seat-key]')?.getAttribute('data-seat-key');
          const target = args.droppableContainers.find((container) => container.id === key && !container.disabled);
          return target ? [{ id: target.id }] : [];
        }}
        accessibility={{ announcements: dndAnnouncements }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => { setActiveDragSeatKey(null); setOverSeatKey(null); window.setTimeout(() => { justDraggedRef.current = false; }, 0); announce(t('classroom.drag_cancelled')); }}
      >
        {layoutDef.roomFeatures !== undefined ? (
          <RoomLayoutRenderer seats={seats} zoomLevel={zoomLevel} gridContainerRef={gridContainerRef}
            renderSeatCard={renderSeatCard} showRelations={showRelations} activeSeatKey={selectedSeatKey ?? hoveredSeatKey}
            result={result} students={students} />
        ) : isAbsoluteLayout ? (
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

        {/* Fixed viewport coordinates must escape the backdrop-filter panel,
            which otherwise becomes the overlay's containing block. */}
        {createPortal(<DragOverlay style={{ pointerEvents: 'none', zIndex: 100 }} adjustScale={false} dropAnimation={null}>
          {activeDragStudent ? (
            <div data-testid="drag-ghost" style={dragSize}><DragGhost
              student={activeDragStudent}
              variant={isAbsoluteLayout ? 'absolute' : 'rows'}
            /></div>
          ) : null}
        </DragOverlay>, document.body)}
      </DndContext>

      {/* The context menu and legends only render for the
          row-based layouts — matching the pre-refactor behavior, where
          they lived inside the row branch. */}
      {createPortal(activeDragSeatKey ? null : <StudentHoverPopup student={hoveredStudent} anchor={hoverAnchor}
        onClose={closeHover} onPointerEnter={keepHoverOpen} onPointerLeave={leaveHover} />, document.body)}

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


          {/* Heat map legend */}
          <HeatMapLegend mode={heatMapMode} t={t} />

          {/* Static legend */}
          {heatMapMode === 'none' && <StaticLegend t={t} />}
        </>
      )}
    </div>
  );
}
