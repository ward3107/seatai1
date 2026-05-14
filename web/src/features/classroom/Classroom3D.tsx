/**
 * 3D Classroom View
 *
 * Pure CSS 3D — no WebGL dependency. The classroom is rendered as a
 * series of nested transforms:
 *
 *   <perspective container>
 *     └─ <scene>            ← tilts + rotates the whole room
 *         ├─ <floor>        ← the wood-ish slab everything sits on
 *         └─ <seat * n>     ← each seat is positioned in 3D space
 *             ├─ <desk>     ← a low slab in front of the chair
 *             └─ <chair>    ← seat pad + chair back
 *
 * Positions are computed from row/col so any classroom size renders
 * correctly. Previous version hardcoded a 5×6 grid which left seats
 * floating outside the floor for any other dimensions.
 */

import { useEffect, useState } from 'react';
import { Box, RotateCw } from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '../../hooks/useLanguage';
import type { Seat, Student } from '../../types';

interface Classroom3DProps {
  seats: Seat[];
  students: Student[];
  rows: number;
  cols: number;
  onStudentClick?: (studentId: string) => void;
}

// ─── Layout constants ──────────────────────────────────────────────────────
// All sizes in CSS px. The floor sizes itself to the grid, so these stay
// fixed regardless of class size.
const SEAT_W = 64;
const SEAT_D = 56; // depth (front-to-back)
const GAP_X = 16;
const GAP_Z = 24; // rows are spaced a little wider than columns
const FLOOR_PAD = 40;

type Perspective = 'isometric' | 'front' | 'teacher' | 'back';

const PRESETS: Record<Perspective, { rotX: number; rotY: number }> = {
  isometric: { rotX: 58, rotY: -28 },
  front: { rotX: 22, rotY: 0 },
  teacher: { rotX: 30, rotY: 0 },
  back: { rotX: 22, rotY: 180 },
};

const PRESET_LABELS: Record<Perspective, string> = {
  isometric: '3D',
  front: 'Front',
  teacher: 'Teacher',
  back: 'Back',
};

// ─── Single seat ───────────────────────────────────────────────────────────

function SeatCard3D({
  seat,
  student,
  x,
  z,
  isViolated,
  onClick,
}: {
  seat: Seat;
  student?: Student;
  x: number;
  z: number;
  isViolated: boolean;
  onClick?: () => void;
}) {
  const gender = student?.gender;
  const seatFill =
    gender === 'female'
      ? 'from-pink-300 to-pink-500'
      : gender === 'male'
        ? 'from-blue-300 to-blue-500'
        : student
          ? 'from-purple-300 to-purple-500'
          : 'from-gray-200 to-gray-300';

  return (
    <div
      className="absolute"
      style={{
        // Lay seats on the floor: X/Z plane. We translate by half-size so
        // the position is the seat's center, not its corner.
        transform: `translate3d(${x - SEAT_W / 2}px, 0, ${z - SEAT_D / 2}px)`,
        transformStyle: 'preserve-3d',
        width: SEAT_W,
        height: SEAT_D,
      }}
    >
      {/* Desk slab — sits flat on the floor, in front of the chair */}
      {!seat.is_empty && (
        <div
          className="absolute left-1 right-1 rounded-md bg-gradient-to-b from-amber-200 to-amber-400 shadow-md"
          style={{
            height: 6,
            top: -6,
            transform: 'rotateX(90deg) translateZ(-8px)',
            transformOrigin: 'top center',
          }}
        />
      )}

      {/* Chair pad — flat slab the student "sits" on */}
      <div
        className={clsx(
          'absolute inset-1 rounded-md shadow-lg bg-gradient-to-br border',
          seatFill,
          isViolated ? 'border-red-500 ring-2 ring-red-500' : 'border-white/40',
        )}
        style={{
          transform: 'rotateX(90deg) translateZ(0)',
          transformOrigin: 'center center',
        }}
      />

      {/* Standing label (faces the camera) — initial + first name */}
      {student && (
        <button
          type="button"
          onClick={onClick}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center group focus:outline-none"
          style={{
            top: -2,
            transform: 'translateX(-50%) translateZ(28px) rotateX(-90deg)',
            transformOrigin: 'bottom center',
          }}
          aria-label={student.name}
          title={student.name}
        >
          <div className="w-8 h-8 rounded-full bg-white/95 border border-gray-200 shadow flex items-center justify-center text-xs font-bold text-gray-700 group-hover:ring-2 group-hover:ring-primary-400 transition">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <span className="mt-0.5 text-[10px] leading-none px-1 py-0.5 rounded bg-white/85 text-gray-700 max-w-[64px] truncate">
            {student.name.split(' ')[0]}
          </span>
        </button>
      )}
    </div>
  );
}

// ─── Main view ─────────────────────────────────────────────────────────────

export default function Classroom3D({
  seats,
  students,
  rows,
  cols,
  onStudentClick,
}: Classroom3DProps) {
  const { t } = useLanguage();
  const [preset, setPreset] = useState<Perspective>('isometric');
  const [autoRotate, setAutoRotate] = useState(false);
  const [spin, setSpin] = useState(0);

  useEffect(() => {
    if (!autoRotate) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setSpin((s) => (s + dt * 0.02) % 360); // ~12°/s, framerate-independent
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate]);

  const studentMap = new Map(students.map((s) => [s.id, s]));

  const floorW = cols * SEAT_W + (cols - 1) * GAP_X + FLOOR_PAD * 2;
  const floorD = rows * SEAT_D + (rows - 1) * GAP_Z + FLOOR_PAD * 2;

  const { rotX, rotY } = PRESETS[preset];

  // Center the seat grid on the floor.
  const seatOriginX = -((cols - 1) * (SEAT_W + GAP_X)) / 2;
  const seatOriginZ = -((rows - 1) * (SEAT_D + GAP_Z)) / 2;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Box size={16} className="text-gray-500" aria-hidden="true" />
          <span className="text-sm font-medium text-gray-700">
            {t('classroom.3d_view')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5"
            role="group"
            aria-label="Camera angle"
          >
            {(Object.keys(PRESETS) as Perspective[]).map((key) => (
              <button
                key={key}
                onClick={() => setPreset(key)}
                aria-pressed={preset === key}
                className={clsx(
                  'px-2 py-1 text-xs font-medium rounded transition-colors min-w-[2rem]',
                  preset === key
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:bg-white/70',
                )}
                title={PRESET_LABELS[key]}
              >
                {PRESET_LABELS[key]}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAutoRotate((v) => !v)}
            aria-pressed={autoRotate}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              autoRotate
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
            title={
              autoRotate
                ? t('classroom.stop_rotation')
                : t('classroom.auto_rotate')
            }
          >
            <RotateCw size={14} className={autoRotate ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 3D stage */}
      <div
        className="relative bg-gradient-to-b from-sky-50 via-slate-50 to-slate-100 rounded-2xl overflow-hidden border border-gray-200"
        style={{
          height: 'min(540px, 60vh)',
          perspective: '1100px',
          perspectiveOrigin: '50% 35%',
        }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotX}deg) rotateY(${rotY + spin}deg)`,
            transition: autoRotate ? 'none' : 'transform 0.45s ease-out',
          }}
        >
          {/* Floor */}
          <div
            className="absolute rounded-2xl shadow-2xl"
            style={{
              width: floorW,
              height: floorD,
              transform: 'rotateX(90deg)',
              transformOrigin: 'center center',
              background:
                'repeating-linear-gradient(90deg, #fde68a 0 80px, #fcd34d 80px 81px), linear-gradient(135deg, #fef3c7, #fde68a)',
              backgroundBlendMode: 'multiply',
              border: '4px solid #fbbf24',
            }}
            aria-hidden="true"
          />

          {/* Teacher area marker */}
          <div
            className="absolute rounded-lg border-2 border-dashed border-emerald-400 bg-emerald-50/70 text-emerald-700 text-[11px] font-medium flex items-center justify-center"
            style={{
              width: Math.min(180, floorW * 0.4),
              height: 36,
              transform: `translate3d(0, 0, ${seatOriginZ - SEAT_D / 2 - 40}px) rotateX(90deg)`,
              transformOrigin: 'center center',
            }}
            aria-hidden="true"
          >
            {t('classroom.teacher_area') ?? 'Teacher'}
          </div>

          {/* Seats */}
          {seats.map((seat) => {
            const x = seatOriginX + seat.position.col * (SEAT_W + GAP_X);
            const z = seatOriginZ + seat.position.row * (SEAT_D + GAP_Z);
            const student = seat.student_id ? studentMap.get(seat.student_id) : undefined;
            return (
              <SeatCard3D
                key={`${seat.position.row}-${seat.position.col}`}
                seat={seat}
                student={student}
                x={x}
                z={z}
                isViolated={false}
                onClick={() => student && onStudentClick?.(student.id)}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-blue-300 to-blue-500" />
          <span>{t('classroom.legend_male')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-pink-300 to-pink-500" />
          <span>{t('classroom.legend_female')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-purple-300 to-purple-500" />
          <span>{t('classroom.legend_other')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-gray-200 to-gray-300" />
          <span>{t('classroom.legend_empty')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-dashed border-emerald-400 bg-emerald-50" />
          <span>{t('classroom.teacher_area') ?? 'Teacher'}</span>
        </div>
      </div>
    </div>
  );
}
