import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  X,
  BookOpen,
  Users,
  AlertTriangle,
  Heart,
  Globe,
  Accessibility,
} from 'lucide-react';
import clsx from 'clsx';
import { useState, useRef, useCallback } from 'react';
import { useStore } from '../../core/store';
import SeatCard from './SeatCard';
import RelationshipOverlay from './RelationshipOverlay';
import GridControls from './GridControls';
import { useSeatingHistory } from '../../hooks/useSeatingHistory';
import { getViolations } from '../../utils/seatingUtils';
import type { Seat, Student } from '../../types';

// ─── helpers ───────────────────────────────────────────────────────────────

function createEmptyGrid(rows: number, cols: number): Seat[] {
  const seats: Seat[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      seats.push({
        position: { row, col, is_front_row: row === 0, is_near_teacher: row < 2 },
        student_id: undefined,
        is_empty: true,
      });
    }
  }
  return seats;
}

function groupIntoDesks(rowSeats: Seat[]): Seat[][] {
  const sorted = [...rowSeats].sort((a, b) => a.position.col - b.position.col);
  const desks: Seat[][] = [];
  for (let i = 0; i < sorted.length; i += 2) {
    desks.push(sorted.slice(i, i + 2));
  }
  return desks;
}

// ─── heat-map legend ────────────────────────────────────────────────────────

function HeatMapLegend({ mode }: { mode: string }) {
  if (mode === 'none') return null;

  const items =
    mode === 'gender'
      ? [
          { color: 'bg-blue-300', label: 'Male' },
          { color: 'bg-pink-300', label: 'Female' },
          { color: 'bg-purple-300', label: 'Other' },
        ]
      : mode === 'conflicts'
      ? [
          { color: 'bg-emerald-200', label: 'No violation' },
          { color: 'bg-red-200', label: 'Violation' },
        ]
      : [
          { color: 'bg-emerald-200', label: '85–100' },
          { color: 'bg-green-200', label: '70–84' },
          { color: 'bg-yellow-200', label: '55–69' },
          { color: 'bg-orange-200', label: '40–54' },
          { color: 'bg-red-200', label: '0–39' },
        ];

  return (
    <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs text-gray-500">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={`w-3.5 h-3.5 rounded ${item.color} border border-gray-300`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

export default function ClassroomGrid() {
  const {
    result,
    rows,
    cols,
    students,
    lockedSeats,
    heatMapMode,
    zoomLevel,
    selectedSeatKey,
    showRelations,
    setSelectedSeat,
    setShowRelations,
    swapStudents,
    toggleLockSeat,
  } = useStore();

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

  const seats = result?.layout.seats ?? createEmptyGrid(rows, cols);
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const violations = result ? getViolations(result, students) : new Set<string>();

  // ── DnD sensors ──────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
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

  // ── Click-to-swap ─────────────────────────────────────────────────────────
  const handleSeatClick = useCallback(
    (seatKey: string) => {
      setContextMenu(null);
      if (interactionMode !== 'click') return;

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
        // Only allow selecting occupied seats
        const [row, col] = seatKey.split('-').map(Number);
        const seat = seats.find(
          (s) => s.position.row === row && s.position.col === col
        );
        if (seat?.student_id) setSelectedSeat(seatKey);
      }
    },
    [interactionMode, selectedSeatKey, lockedSeats, swapStudents, seats, setSelectedSeat]
  );

  // ── Context menu ──────────────────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent, seatKey: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, seatKey });
  }, []);

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

  // ── Build row groups ──────────────────────────────────────────────────────
  const rowMap = new Map<number, Seat[]>();
  for (const seat of seats as Seat[]) {
    if (!rowMap.has(seat.position.row)) rowMap.set(seat.position.row, []);
    rowMap.get(seat.position.row)!.push(seat);
  }
  const sortedRows = Array.from(rowMap.entries()).sort(([a], [b]) => a - b);

  return (
    <div
      className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6"
      onClick={() => setContextMenu(null)}
    >
      {/* Toolbar */}
      <GridControls
        interactionMode={interactionMode}
        setInteractionMode={setInteractionMode}
        showRelations={showRelations}
        setShowRelations={setShowRelations}
      />

      {/* Teacher Desk */}
      <div className="flex justify-center mb-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-12 py-3 bg-gradient-to-r from-amber-400 to-orange-400 rounded-lg shadow-lg"
        >
          <span className="font-semibold text-white flex items-center gap-2">
            <User size={18} />
            Teacher's Desk
          </span>
        </motion.div>
      </div>

      {/* Instruction hint */}
      <p className="text-center text-xs text-gray-400 mb-5">
        {interactionMode === 'drag'
          ? '🖱️ Drag students to swap seats — right-click a seat for options'
          : '👆 Click a student to select, then click a destination to swap'}
      </p>

      {/* DnD Context wraps grid + drag overlay */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Zoomable grid wrapper */}
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease',
          }}
        >
          <div ref={gridContainerRef} className="relative">
            <div className="flex flex-col gap-3">
              {sortedRows.map(([rowIndex, rowSeats]) => {
                const desks = groupIntoDesks(rowSeats);
                return (
                  <div key={rowIndex} className="flex gap-4 justify-center items-start">
                    {/* Row number label */}
                    <span className="text-[10px] text-gray-400 font-medium self-center w-8 text-right shrink-0">
                      {rowIndex + 1}
                    </span>

                    {desks.map((deskSeats, deskIdx) => (
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
                        {deskSeats.map((seat) => {
                          const sk = `${seat.position.row}-${seat.position.col}`;
                          const student = seat.student_id
                            ? (studentMap.get(seat.student_id) ?? null)
                            : null;
                          return (
                            <SeatCard
                              key={sk}
                              seat={seat}
                              student={student}
                              seatKey={sk}
                              isLocked={lockedSeats.includes(sk)}
                              isSelected={selectedSeatKey === sk}
                              isViolated={violations.has(sk)}
                              heatMapMode={heatMapMode}
                              interactionMode={interactionMode}
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
                        })}
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
        </div>

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
            className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 min-w-[190px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
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
                <>🔓 <span>Unlock seat</span></>
              ) : (
                <>🔒 <span>Lock seat (keep in place)</span></>
              )}
            </button>
            {violations.has(contextMenu.seatKey) && (
              <div className="px-4 py-2 text-xs text-red-500 flex items-center gap-2 border-t border-gray-100 mt-1">
                <AlertTriangle size={12} />
                Constraint violation here
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Student Hover Popup ── */}
      <AnimatePresence>
        {hoveredStudent && (
          <motion.div
            key="popup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-4 right-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-50"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow',
                    hoveredStudent.gender === 'male'
                      ? 'bg-blue-400'
                      : hoveredStudent.gender === 'female'
                      ? 'bg-pink-400'
                      : 'bg-purple-400'
                  )}
                >
                  {hoveredStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{hoveredStudent.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">
                    {hoveredStudent.gender}
                    {hoveredStudent.age ? `, ${hoveredStudent.age} yrs` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHoveredStudent(null)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={15} className="text-gray-400" />
              </button>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-blue-50 rounded-lg p-2">
                <div className="flex items-center gap-1 text-blue-600 text-xs mb-1">
                  <BookOpen size={11} /> Academic
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 capitalize">
                    {hoveredStudent.academic_level.replace('_', ' ')}
                  </span>
                  <span className="font-bold text-blue-600">
                    {hoveredStudent.academic_score}%
                  </span>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <div className="flex items-center gap-1 text-green-600 text-xs mb-1">
                  <Users size={11} /> Behavior
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 capitalize">
                    {hoveredStudent.behavior_level}
                  </span>
                  <span className="font-bold text-green-600">
                    {hoveredStudent.behavior_score}%
                  </span>
                </div>
              </div>
            </div>

            {/* Special needs */}
            {(hoveredStudent.requires_front_row ||
              hoveredStudent.requires_quiet_area ||
              hoveredStudent.has_mobility_issues ||
              hoveredStudent.special_needs.length > 0) && (
              <div className="bg-amber-50 rounded-lg p-2 mb-3">
                <div className="flex items-center gap-1 text-amber-600 text-xs font-medium mb-1.5">
                  <Accessibility size={11} /> Special Requirements
                </div>
                <div className="flex flex-wrap gap-1">
                  {hoveredStudent.requires_front_row && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                      Front Row ⭐
                    </span>
                  )}
                  {hoveredStudent.requires_quiet_area && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                      Quiet 🔇
                    </span>
                  )}
                  {hoveredStudent.has_mobility_issues && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full">
                      Mobility ♿
                    </span>
                  )}
                  {hoveredStudent.special_needs.map((need: { type: string }, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-amber-100 text-amber-600 text-xs rounded-full"
                    >
                      {need.type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Social */}
            <div className="flex gap-2">
              {hoveredStudent.friends_ids.length > 0 && (
                <div className="flex-1 bg-green-50 rounded-lg p-2">
                  <div className="flex items-center gap-1 text-green-600 text-xs mb-1">
                    <Heart size={11} /> Friends
                  </div>
                  <p className="text-xs text-gray-600">
                    {hoveredStudent.friends_ids.length} friend
                    {hoveredStudent.friends_ids.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
              {hoveredStudent.incompatible_ids.length > 0 && (
                <div className="flex-1 bg-red-50 rounded-lg p-2">
                  <div className="flex items-center gap-1 text-red-600 text-xs mb-1">
                    <AlertTriangle size={11} /> Conflicts
                  </div>
                  <p className="text-xs text-gray-600">
                    {hoveredStudent.incompatible_ids.length} conflict
                    {hoveredStudent.incompatible_ids.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
              {hoveredStudent.is_bilingual && (
                <div className="flex-1 bg-purple-50 rounded-lg p-2">
                  <div className="flex items-center gap-1 text-purple-600 text-xs mb-1">
                    <Globe size={11} /> Language
                  </div>
                  <p className="text-xs text-gray-600 truncate">
                    {hoveredStudent.primary_language ?? 'Bilingual'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heat map legend */}
      <HeatMapLegend mode={heatMapMode} />

      {/* Static legend */}
      {heatMapMode === 'none' && (
        <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-blue-50 border-2 border-blue-200" />
            Front Row
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-400" />
            Male
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-pink-400" />
            Female
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-red-100 border-2 border-red-400" />
            Constraint violation
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">🔒</span>
            Locked seat
          </div>
        </div>
      )}
    </div>
  );
}
