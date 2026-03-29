import type { Student, OptimizationResult } from '../types';
import type { HeatMapMode } from '../core/store';

/**
 * Returns the set of seat keys ("row-col") that have active constraint violations.
 * A violation is:
 *   - A student who requires the front row but is not in row 0
 *   - A student who has mobility issues but is not in row 0
 *   - A student seated adjacent (horizontally or vertically) to an incompatible student
 */
export function getViolations(
  result: OptimizationResult,
  students: Student[]
): Set<string> {
  const violations = new Set<string>();
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const cols = result.layout.cols;

  for (const seat of result.layout.seats) {
    if (!seat.student_id) continue;
    const student = studentMap.get(seat.student_id);
    if (!student) continue;

    const seatKey = `${seat.position.row}-${seat.position.col}`;

    // Front-row / mobility violation
    if ((student.requires_front_row || student.has_mobility_issues) && seat.position.row > 0) {
      violations.add(seatKey);
    }

    // Incompatible adjacency (horizontal + vertical neighbours)
    const neighbours = [
      { row: seat.position.row, col: seat.position.col - 1 },
      { row: seat.position.row, col: seat.position.col + 1 },
      { row: seat.position.row - 1, col: seat.position.col },
      { row: seat.position.row + 1, col: seat.position.col },
    ];

    for (const pos of neighbours) {
      if (pos.row < 0 || pos.col < 0 || pos.col >= cols) continue;
      const neighbour = result.layout.seats.find(
        (s) => s.position.row === pos.row && s.position.col === pos.col
      );
      if (!neighbour?.student_id) continue;
      if (student.incompatible_ids.includes(neighbour.student_id)) {
        violations.add(seatKey);
        violations.add(`${pos.row}-${pos.col}`);
      }
    }
  }

  return violations;
}

/**
 * Returns Tailwind bg + border colour classes for a seat based on the
 * active heat-map mode and whether the seat has a violation.
 */
export function getHeatMapColor(
  mode: HeatMapMode,
  student: Student | null | undefined,
  isViolated: boolean
): string {
  if (!student) return '';

  switch (mode) {
    case 'academic': {
      const s = student.academic_score;
      if (s >= 85) return 'bg-emerald-100 border-emerald-400';
      if (s >= 70) return 'bg-green-100 border-green-400';
      if (s >= 55) return 'bg-yellow-100 border-yellow-400';
      if (s >= 40) return 'bg-orange-100 border-orange-400';
      return 'bg-red-100 border-red-400';
    }
    case 'behavior': {
      const s = student.behavior_score;
      if (s >= 85) return 'bg-emerald-100 border-emerald-400';
      if (s >= 70) return 'bg-green-100 border-green-400';
      if (s >= 55) return 'bg-yellow-100 border-yellow-400';
      if (s >= 40) return 'bg-orange-100 border-orange-400';
      return 'bg-red-100 border-red-400';
    }
    case 'gender': {
      if (student.gender === 'male') return 'bg-blue-100 border-blue-400';
      if (student.gender === 'female') return 'bg-pink-100 border-pink-400';
      return 'bg-purple-100 border-purple-400';
    }
    case 'conflicts': {
      return isViolated
        ? 'bg-red-100 border-red-400'
        : 'bg-emerald-50 border-emerald-300';
    }
    default:
      return '';
  }
}

/**
 * Builds a map of studentId → seatKey for all occupied seats.
 */
export function buildStudentToSeatMap(result: OptimizationResult): Map<string, string> {
  const map = new Map<string, string>();
  for (const seat of result.layout.seats) {
    if (seat.student_id) {
      map.set(seat.student_id, `${seat.position.row}-${seat.position.col}`);
    }
  }
  return map;
}
