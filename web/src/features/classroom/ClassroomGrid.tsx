import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../core/store';
import { User, X, BookOpen, Users, AlertTriangle, Heart, Globe, Accessibility } from 'lucide-react';
import clsx from 'clsx';
import { useState, useRef } from 'react';
import type { Student } from '../../types';

export default function ClassroomGrid() {
  const { result, rows, cols, students, setStudents, setResult } = useStore();
  const [hoveredStudent, setHoveredStudent] = useState<Student | null>(null);
  const [draggedStudent, setDraggedStudent] = useState<Student | null>(null);
  const [dragSourceSeat, setDragSourceSeat] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Create grid from result or empty grid
  const seats = result?.layout.seats || createEmptyGrid(rows, cols);
  const studentMap = new Map(students.map(s => [s.id, s]));

  // Group seats into desks (2 seats per desk)
  const desks = groupIntoDesks(seats, cols);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, student: Student, seatKey: string) => {
    setDraggedStudent(student);
    setDragSourceSeat(seatKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', student.id);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetSeatKey: string) => {
    e.preventDefault();

    if (!draggedStudent || !dragSourceSeat || dragSourceSeat === targetSeatKey) {
      setDraggedStudent(null);
      setDragSourceSeat(null);
      return;
    }

    // Parse seat keys
    const [srcRow, srcCol] = dragSourceSeat.split('-').map(Number);
    const [tgtRow, tgtCol] = targetSeatKey.split('-').map(Number);

    // Update the seats array
    const newSeats = [...seats];
    const srcSeatIndex = newSeats.findIndex(s => s.position.row === srcRow && s.position.col === srcCol);
    const tgtSeatIndex = newSeats.findIndex(s => s.position.row === tgtRow && s.position.col === tgtCol);

    if (srcSeatIndex !== -1 && tgtSeatIndex !== -1) {
      // Swap students
      const srcStudentId = newSeats[srcSeatIndex].student_id;
      const tgtStudentId = newSeats[tgtSeatIndex].student_id;

      newSeats[srcSeatIndex] = {
        ...newSeats[srcSeatIndex],
        student_id: tgtStudentId,
        is_empty: !tgtStudentId,
      };
      newSeats[tgtSeatIndex] = {
        ...newSeats[tgtSeatIndex],
        student_id: srcStudentId,
        is_empty: !srcStudentId,
      };

      // Update result
      if (result) {
        setResult({
          ...result,
          layout: { ...result.layout, seats: newSeats },
        });
      }
    }

    setDraggedStudent(null);
    setDragSourceSeat(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedStudent(null);
    setDragSourceSeat(null);
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6">
      {/* Teacher Desk */}
      <div className="flex justify-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-12 py-4 bg-gradient-to-r from-amber-400 to-orange-400 rounded-lg shadow-lg"
        >
          <span className="font-semibold text-white flex items-center gap-2 text-lg">
            <User size={20} />
            Teacher's Desk
          </span>
        </motion.div>
      </div>

      {/* Instructions */}
      <div className="mb-4 text-center text-sm text-gray-500">
        🖱️ Drag students to swap seats • Hover to see details
      </div>

      {/* Seating Grid - Desks with 2 seats each */}
      <div
        ref={gridRef}
        className="grid gap-4 justify-center"
        style={{ gridTemplateColumns: `repeat(${Math.ceil(cols / 2)}, minmax(180px, 1fr))` }}
      >
        <AnimatePresence mode="popLayout">
          {desks.map((desk, deskIndex) => (
            <motion.div
              key={`desk-${desk.row}-${desk.deskCol}`}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
                delay: result ? deskIndex * 0.02 : 0,
              }}
              className={clsx(
                'rounded-xl p-2 flex gap-2 relative',
                'border-2 bg-amber-50 border-amber-200',
                desk.isFrontRow && 'border-blue-300 bg-blue-50'
              )}
            >
              {/* Desk label */}
              <div className="absolute -top-2 left-2 text-[10px] text-gray-400 font-medium bg-white px-1 rounded">
                Row {desk.row + 1}
              </div>

              {/* Two seats in desk */}
              {desk.seats.map((seat) => {
                const student = seat.student_id ? studentMap.get(seat.student_id) : null;
                const hasIssue = student?.requires_front_row && !seat.position.is_front_row;
                const seatKey = `${seat.position.row}-${seat.position.col}`;
                const isDragging = draggedStudent?.id === student?.id;

                return (
                  <div
                    key={seatKey}
                    draggable={!!student}
                    onDragStart={(e) => student && handleDragStart(e, student, seatKey)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, seatKey)}
                    onDragEnd={handleDragEnd}
                    onMouseEnter={() => student && setHoveredStudent(student)}
                    onMouseLeave={() => setHoveredStudent(null)}
                    className={clsx(
                      'flex-1 rounded-lg p-2 flex flex-col items-center justify-center min-h-[90px]',
                      'border-2 transition-all duration-200 cursor-grab',
                      'hover:shadow-md hover:scale-[1.02]',
                      seat.is_empty
                        ? 'border-gray-200 bg-gray-50 cursor-default'
                        : hasIssue
                        ? 'border-red-300 bg-red-50 hover:border-red-400'
                        : 'border-gray-300 bg-white hover:border-primary-300',
                      isDragging && 'opacity-50 scale-95',
                      draggedStudent && !seat.is_empty && 'border-dashed'
                    )}
                  >
                    {student ? (
                      <>
                        {/* Avatar */}
                        <div
                          className={clsx(
                            'w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm',
                            student.gender === 'male'
                              ? 'bg-blue-400'
                              : student.gender === 'female'
                              ? 'bg-pink-400'
                              : 'bg-purple-400'
                          )}
                        >
                          {student.name.charAt(0)}
                        </div>

                        {/* Name */}
                        <p className="mt-1 text-xs font-medium text-gray-700 text-center truncate w-full">
                          {student.name.split(' ')[0]}
                        </p>

                        {/* Indicators */}
                        <div className="flex gap-1 mt-1">
                          {student.requires_front_row && (
                            <span className="w-2 h-2 rounded-full bg-red-400" title="Front row required" />
                          )}
                          {student.friends_ids.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-green-400" title="Has friends" />
                          )}
                          {student.incompatible_ids.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-orange-400" title="Has conflicts" />
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <span className="text-gray-300 text-[10px]">Empty</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Hover Info Popup */}
      <AnimatePresence>
        {hoveredStudent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 right-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-50"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg',
                    hoveredStudent.gender === 'male'
                      ? 'bg-blue-400'
                      : hoveredStudent.gender === 'female'
                      ? 'bg-pink-400'
                      : 'bg-purple-400'
                  )}
                >
                  {hoveredStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{hoveredStudent.name}</h3>
                  <p className="text-sm text-gray-500">
                    {hoveredStudent.gender}, {hoveredStudent.age || '?'} yrs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHoveredStudent(null)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-blue-50 rounded-lg p-2">
                <div className="flex items-center gap-1 text-blue-600 text-xs mb-1">
                  <BookOpen size={12} />
                  Academic
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 capitalize">{hoveredStudent.academic_level.replace('_', ' ')}</span>
                  <span className="font-bold text-blue-600">{hoveredStudent.academic_score}%</span>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <div className="flex items-center gap-1 text-green-600 text-xs mb-1">
                  <Users size={12} />
                  Behavior
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 capitalize">{hoveredStudent.behavior_level}</span>
                  <span className="font-bold text-green-600">{hoveredStudent.behavior_score}%</span>
                </div>
              </div>
            </div>

            {/* Special Needs */}
            {(hoveredStudent.requires_front_row || hoveredStudent.requires_quiet_area || hoveredStudent.has_mobility_issues || hoveredStudent.special_needs.length > 0) && (
              <div className="bg-amber-50 rounded-lg p-2 mb-3">
                <div className="flex items-center gap-1 text-amber-600 text-xs font-medium mb-2">
                  <Accessibility size={12} />
                  Special Requirements
                </div>
                <div className="flex flex-wrap gap-1">
                  {hoveredStudent.requires_front_row && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">Front Row</span>
                  )}
                  {hoveredStudent.requires_quiet_area && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">Quiet Area</span>
                  )}
                  {hoveredStudent.has_mobility_issues && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full">Mobility</span>
                  )}
                  {hoveredStudent.special_needs.map((need, i) => (
                    <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-600 text-xs rounded-full">
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
                    <Heart size={12} />
                    Friends
                  </div>
                  <p className="text-xs text-gray-600">
                    {hoveredStudent.friends_ids.length} friend{hoveredStudent.friends_ids.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
              {hoveredStudent.incompatible_ids.length > 0 && (
                <div className="flex-1 bg-red-50 rounded-lg p-2">
                  <div className="flex items-center gap-1 text-red-600 text-xs mb-1">
                    <AlertTriangle size={12} />
                    Conflicts
                  </div>
                  <p className="text-xs text-gray-600">
                    {hoveredStudent.incompatible_ids.length} conflict{hoveredStudent.incompatible_ids.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
              {hoveredStudent.is_bilingual && (
                <div className="flex-1 bg-purple-50 rounded-lg p-2">
                  <div className="flex items-center gap-1 text-purple-600 text-xs mb-1">
                    <Globe size={12} />
                    Language
                  </div>
                  <p className="text-xs text-gray-600 truncate">{hoveredStudent.primary_language || 'Bilingual'}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-300" />
          <span>Front Row</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-400" />
          <span>Male</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-pink-400" />
          <span>Female</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span>Needs Front Row</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span>Has Friends</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-400" />
          <span>Has Conflicts</span>
        </div>
      </div>
    </div>
  );
}

// Group seats into desks (2 seats per desk, side by side)
function groupIntoDesks(seats: any[], cols: number) {
  const desks: { row: number; deskCol: number; seats: any[]; isFrontRow: boolean }[] = [];

  // Group by row
  const rowMap = new Map<number, any[]>();
  for (const seat of seats) {
    const row = seat.position.row;
    if (!rowMap.has(row)) rowMap.set(row, []);
    rowMap.get(row)!.push(seat);
  }

  // Sort each row and create desks
  for (const [row, rowSeats] of rowMap) {
    rowSeats.sort((a, b) => a.position.col - b.position.col);

    for (let i = 0; i < rowSeats.length; i += 2) {
      const deskSeats = [rowSeats[i]];
      if (i + 1 < rowSeats.length) {
        deskSeats.push(rowSeats[i + 1]);
      } else {
        // Add empty seat placeholder if odd number
        deskSeats.push({
          position: { row, col: rowSeats[i].position.col + 1, is_front_row: row === 0 },
          student_id: undefined,
          is_empty: true,
        });
      }

      desks.push({
        row,
        deskCol: Math.floor(i / 2),
        seats: deskSeats,
        isFrontRow: row === 0,
      });
    }
  }

  // Sort desks by row then desk column
  desks.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.deskCol - b.deskCol;
  });

  return desks;
}

function createEmptyGrid(rows: number, cols: number) {
  const seats = [];
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
