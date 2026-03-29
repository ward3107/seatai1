/**
 * 3D Classroom View Component
 *
 * Provides an isometric/perspective 3D view of the classroom
 * using CSS transforms for better browser compatibility.
 */

import { useState, useEffect } from 'react';
import { Box, RotateCw } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import clsx from 'clsx';
import type { Seat, Student } from '../../types';

interface Classroom3DProps {
  seats: Seat[];
  students: Student[];
  rows: number;
  cols: number;
  onStudentClick?: (studentId: string) => void;
}

// Calculate isometric projection from 2D grid
function calculate3DPosition(row: number, col: number, rows: number, cols: number) {
  // Isometric-like projection
  const seatWidth = 60;
  const seatDepth = 50;
  const rowHeight = 40;
  const spacing = 10;

  // Base position - center the classroom
  const xOffset = (cols * (seatWidth + spacing)) / 2;
  const zOffset = (rows * (seatDepth + spacing)) / 2;

  // Calculate position with isometric-like transform
  const x = col * (seatWidth + spacing) - xOffset;
  const y = row * (seatDepth + spacing) - zOffset;
  const z = row * rowHeight;

  return { x, y, z };
}

function Seat3D({
  seat,
  student,
  isSelected,
  onClick,
}: {
  seat: Seat;
  student?: Student;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const { row, col } = seat.position;
  const pos = calculate3DPosition(row, col, 5, 6);

  const baseColor = student
    ? student.gender === 'female'
      ? 'from-pink-300 to-pink-400'
      : student.gender === 'male'
        ? 'from-blue-300 to-blue-400'
        : 'from-purple-300 to-purple-400'
    : 'from-gray-200 to-gray-300';

  return (
    <div
      className={clsx(
        'absolute cursor-pointer transition-all duration-200',
        'hover:z-10 hover:scale-105',
        isSelected && 'ring-2 ring-primary-500 ring-offset-2'
      )}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px)`,
        transformStyle: 'preserve-3d',
      }}
      onClick={onClick}
    >
      {/* Seat base */}
      <div
        className={clsx(
          'w-12 h-10 rounded-lg shadow-lg bg-gradient-to-br',
          baseColor,
          'border-2 border-white/30'
        )}
      >
        {student && (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] font-medium text-gray-700 truncate px-1">
              {student.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Desk (front) */}
      {!seat.is_empty && (
        <div
          className="absolute -bottom-2 left-1 right-1 h-2 rounded bg-gradient-to-b from-amber-200 to-amber-300 border border-amber-400/50"
          style={{ transform: 'rotateX(60deg)' }}
        />
      )}

      {/* Chair back */}
      {seat.is_empty && (
        <div
          className="absolute -top-1 left-1 right-1 h-1 rounded-t bg-gray-300/50"
          style={{ transform: 'rotateX(-45deg)' }}
        />
      )}
    </div>
  );
}

// View mode for different perspectives
type ViewPerspective = 'isometric' | 'front' | 'teacher' | 'back';

interface Perspective3DProps {
  perspective: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  label: string;
}

const VIEW_PRESETS: Record<ViewPerspective, Perspective3DProps> = {
  isometric: { perspective: 1000, rotateX: 60, rotateY: -30, rotateZ: 0, label: '3D View' },
  front: { perspective: 800, rotateX: 0, rotateY: 0, rotateZ: 0, label: 'Front View' },
  teacher: { perspective: 1200, rotateX: 30, rotateY: 0, rotateZ: 0, label: "Teacher's View" },
  back: { perspective: 800, rotateX: 0, rotateY: 180, rotateZ: 0, label: 'Back View' },
};

export default function Classroom3D({ seats, students, rows, cols, onStudentClick }: Classroom3DProps) {
  const { t } = useLanguage();
  const [perspective, setPerspective] = useState<ViewPerspective>('isometric');
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);

  const currentPreset = VIEW_PRESETS[perspective];

  const handlePerspectiveChange = (newPerspective: ViewPerspective) => {
    setPerspective(newPerspective);
    setRotationAngle(0);
  };

  const toggleAutoRotate = () => {
    setAutoRotate(!autoRotate);
    if (!autoRotate) {
      setRotationAngle(0);
    }
  };

  // Auto-rotate effect
  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      setRotationAngle((prev) => (prev + 0.5) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [autoRotate]);

  const studentMap = new Map(students.map((s) => [s.id, s]));

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Box size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">{t('classroom.3d_view')}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Perspective buttons */}
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            {(Object.entries(VIEW_PRESETS) as [ViewPerspective, Perspective3DProps][]).map(
              ([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handlePerspectiveChange(key)}
                  className={clsx(
                    'px-2 py-1 text-xs font-medium rounded transition-colors',
                    perspective === key
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:bg-white/70'
                  )}
                  title={preset.label}
                >
                  {preset.label.charAt(0)}
                </button>
              )
            )}
          </div>

          {/* Auto-rotate toggle */}
          <button
            onClick={toggleAutoRotate}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              autoRotate
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            title={autoRotate ? t('classroom.stop_rotation') : t('classroom.auto_rotate')}
          >
            <RotateCw size={14} className={autoRotate ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 3D Classroom View */}
      <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl overflow-hidden"
        style={{
          height: '400px',
          perspective: `${currentPreset.perspective}px`,
        }}>
        {/* Classroom floor */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
            transform: `
              rotateX(${currentPreset.rotateX}deg)
              rotateY(${currentPreset.rotateY + rotationAngle}deg)
              rotateZ(${currentPreset.rotateZ}deg)
            `,
            transition: 'transform 0.5s ease-out',
          }}
        >
          {/* Floor plane */}
          <div
            className="absolute bg-gradient-to-br from-amber-100 to-amber-50 border-4 border-amber-200 rounded-xl"
            style={{
              width: `${cols * 70 + 40}px`,
              height: `${rows * 60 + 40}px`,
              transform: 'translateZ(-20px) rotateX(90deg)',
            }}
          />

          {/* Seats */}
          {seats.map((seat) => {
            const student = seat.student_id ? studentMap.get(seat.student_id) : undefined;
            return (
              <Seat3D
                key={`${seat.position.row}-${seat.position.col}`}
                seat={seat}
                student={student}
                onClick={() => student && onStudentClick?.(student.id)}
              />
            );
          })}

          {/* Classroom walls (decorative) */}
          <div
            className="absolute bg-white/20 backdrop-blur-sm rounded-lg border border-white/30"
            style={{
              width: `${cols * 70 + 60}px`,
              height: '2px',
              transform: 'translateZ(0px)',
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-blue-300 to-blue-400" />
          <span>{t('classroom.legend_male')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-pink-300 to-pink-400" />
          <span>{t('classroom.legend_female')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-purple-300 to-purple-400" />
          <span>{t('classroom.legend_other')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-gray-200 to-gray-300" />
          <span>{t('classroom.legend_empty')}</span>
        </div>
      </div>
    </div>
  );
}
