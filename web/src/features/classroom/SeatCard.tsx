import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { Lock } from 'lucide-react';
import type { Seat, Student } from '../../types';
import type { HeatMapMode } from '../../core/store';
import { getHeatMapColor } from '../../utils/seatingUtils';

interface Props {
  seat: Seat;
  student: Student | null;
  seatKey: string;
  isLocked: boolean;
  isSelected: boolean;
  isViolated: boolean;
  heatMapMode: HeatMapMode;
  interactionMode: 'drag' | 'click';
  onSeatClick: (seatKey: string) => void;
  onContextMenu: (e: React.MouseEvent, seatKey: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export default function SeatCard({
  seat,
  student,
  seatKey,
  isLocked,
  isSelected,
  isViolated,
  heatMapMode,
  interactionMode,
  onSeatClick,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const isDragMode = interactionMode === 'drag';
  const canDrag = !!student && !isLocked && isDragMode;

  const {
    setNodeRef: setDragRef,
    attributes,
    listeners,
    transform,
    isDragging,
  } = useDraggable({
    id: seatKey,
    disabled: !canDrag,
    data: { seatKey, studentId: student?.id },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: seatKey,
    data: { seatKey },
  });

  // Merge drag + drop refs
  const setRef = (node: HTMLDivElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const dragStyle = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const heatColor = heatMapMode !== 'none' ? getHeatMapColor(heatMapMode, student, isViolated) : '';

  // Build special needs icon string
  const icons: string[] = [];
  if (student?.has_mobility_issues) icons.push('♿');
  if (student?.requires_front_row) icons.push('⭐');
  if (student?.requires_quiet_area) icons.push('🔇');
  if (student?.special_needs?.some((n: { type: string }) => n.type.toLowerCase().includes('adhd'))) icons.push('📚');
  if (
    student?.special_needs?.some(
      (n: { type: string }) => n.type.toLowerCase().includes('vision') || n.type.toLowerCase().includes('blind')
    )
  )
    icons.push('👁️');

  return (
    <div
      ref={setRef}
      style={dragStyle}
      data-seat-key={seatKey}
      onClick={() => onSeatClick(seatKey)}
      onContextMenu={(e) => onContextMenu(e, seatKey)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...(canDrag ? { ...attributes, ...listeners } : {})}
      className={clsx(
        'relative flex-1 rounded-lg p-2 flex flex-col items-center justify-center min-h-[88px]',
        'border-2 transition-all duration-150 select-none',

        // Empty seat
        seat.is_empty && 'border-dashed border-gray-300 bg-gray-50 cursor-default',

        // Occupied seat base
        !seat.is_empty && [
          isDragMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
          heatColor || 'bg-white border-gray-300',
          'hover:shadow-md hover:scale-[1.02]',
        ],

        // Selected (click mode)
        isSelected && 'ring-2 ring-blue-500 ring-offset-1 border-blue-400 scale-105',

        // Drop target highlight
        isOver && !isDragging && 'ring-2 ring-green-400 ring-offset-1 bg-green-50 border-green-400',

        // Currently being dragged
        isDragging && 'opacity-20 scale-95',

        // Violation glow
        isViolated && !isDragging && heatMapMode === 'none' && 'border-red-400 bg-red-50',

        // Locked
        isLocked && 'opacity-60',
      )}
    >
      {/* Lock badge */}
      {isLocked && (
        <div className="absolute top-1 right-1 text-gray-400 pointer-events-none">
          <Lock size={10} />
        </div>
      )}

      {student ? (
        <>
          {/* Avatar */}
          <div
            className={clsx(
              'w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm',
              student.gender === 'male'
                ? 'bg-blue-400'
                : student.gender === 'female'
                ? 'bg-pink-400'
                : 'bg-purple-400'
            )}
          >
            {student.name.charAt(0).toUpperCase()}
          </div>

          {/* First name */}
          <p className="mt-1 text-xs font-medium text-gray-700 text-center truncate w-full leading-tight px-1">
            {student.name.split(' ')[0]}
          </p>

          {/* Special needs icons */}
          {icons.length > 0 && (
            <div className="flex gap-0.5 mt-0.5 text-[10px] leading-none">
              {icons.slice(0, 3).map((icon, i) => (
                <span key={i} title={icon}>
                  {icon}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
          <span className="text-gray-300 text-[9px]">—</span>
        </div>
      )}
    </div>
  );
}
