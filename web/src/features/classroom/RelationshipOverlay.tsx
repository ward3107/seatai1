import { useEffect, useState, RefObject } from 'react';
import type { Student, OptimizationResult } from '../../types';
import { buildStudentToSeatMap } from '../../utils/seatingUtils';

interface LineData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'friend' | 'conflict' | 'conflict-violation';
}

interface Props {
  activeSeatKey: string | null; // selected or hovered seat
  result: OptimizationResult | null;
  students: Student[];
  containerRef: RefObject<HTMLDivElement>;
}

function getSeatCenter(
  seatKey: string,
  container: HTMLDivElement
): { x: number; y: number } | null {
  const el = container.querySelector<HTMLElement>(`[data-seat-key="${seatKey}"]`);
  if (!el) return null;
  const containerRect = container.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left - containerRect.left + rect.width / 2,
    y: rect.top - containerRect.top + rect.height / 2,
  };
}

function isAdjacentSeats(keyA: string, keyB: string): boolean {
  const [rA, cA] = keyA.split('-').map(Number);
  const [rB, cB] = keyB.split('-').map(Number);
  return Math.abs(rA - rB) <= 1 && Math.abs(cA - cB) <= 1 && !(rA === rB && cA === cB);
}

export default function RelationshipOverlay({
  activeSeatKey,
  result,
  students,
  containerRef,
}: Props) {
  const [lines, setLines] = useState<LineData[]>([]);

  useEffect(() => {
    if (!activeSeatKey || !result || !containerRef.current) {
      setLines([]);
      return;
    }

    const container = containerRef.current;
    const [row, col] = activeSeatKey.split('-').map(Number);
    const activeSeat = result.layout.seats.find(
      (s) => s.position.row === row && s.position.col === col
    );
    if (!activeSeat?.student_id) {
      setLines([]);
      return;
    }

    const studentMap = new Map(students.map((s: Student) => [s.id, s]));
    const activeStudent = studentMap.get(activeSeat.student_id);
    if (!activeStudent) {
      setLines([]);
      return;
    }

    const studentToSeat = buildStudentToSeatMap(result);
    const activeCenter = getSeatCenter(activeSeatKey, container);
    if (!activeCenter) {
      setLines([]);
      return;
    }

    const newLines: LineData[] = [];

    // Friend lines (green)
    for (const friendId of activeStudent.friends_ids) {
      const friendSeatKey = studentToSeat.get(friendId);
      if (!friendSeatKey) continue;
      const friendCenter = getSeatCenter(friendSeatKey, container);
      if (!friendCenter) continue;
      newLines.push({
        x1: activeCenter.x,
        y1: activeCenter.y,
        x2: friendCenter.x,
        y2: friendCenter.y,
        type: 'friend',
      });
    }

    // Conflict lines (red, pulsing if adjacent = violation)
    for (const conflictId of activeStudent.incompatible_ids) {
      const conflictSeatKey = studentToSeat.get(conflictId);
      if (!conflictSeatKey) continue;
      const conflictCenter = getSeatCenter(conflictSeatKey, container);
      if (!conflictCenter) continue;
      const isViolating = isAdjacentSeats(activeSeatKey, conflictSeatKey);
      newLines.push({
        x1: activeCenter.x,
        y1: activeCenter.y,
        x2: conflictCenter.x,
        y2: conflictCenter.y,
        type: isViolating ? 'conflict-violation' : 'conflict',
      });
    }

    setLines(newLines);
  }, [activeSeatKey, result, students, containerRef]);

  if (lines.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <filter id="rel-glow-green" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="rel-glow-red" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {lines.map((line, i) => (
        <g key={i}>
          {/* Wide halo for violation lines */}
          {line.type === 'conflict-violation' && (
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="rgba(239,68,68,0.2)"
              strokeWidth={10}
              strokeLinecap="round"
            />
          )}

          {/* Main line */}
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={
              line.type === 'friend'
                ? '#22c55e'
                : line.type === 'conflict-violation'
                ? '#ef4444'
                : '#fca5a5'
            }
            strokeWidth={line.type === 'conflict-violation' ? 2.5 : 1.8}
            strokeLinecap="round"
            strokeDasharray={line.type === 'conflict' ? '5,4' : undefined}
            filter={
              line.type === 'friend'
                ? 'url(#rel-glow-green)'
                : line.type === 'conflict-violation'
                ? 'url(#rel-glow-red)'
                : undefined
            }
            opacity={0.9}
          />

          {/* Dot at each endpoint */}
          <circle
            cx={line.x1}
            cy={line.y1}
            r={3}
            fill={
              line.type === 'friend'
                ? '#22c55e'
                : line.type === 'conflict-violation'
                ? '#ef4444'
                : '#fca5a5'
            }
            opacity={0.8}
          />
          <circle
            cx={line.x2}
            cy={line.y2}
            r={3}
            fill={
              line.type === 'friend'
                ? '#22c55e'
                : line.type === 'conflict-violation'
                ? '#ef4444'
                : '#fca5a5'
            }
            opacity={0.8}
          />
        </g>
      ))}
    </svg>
  );
}
