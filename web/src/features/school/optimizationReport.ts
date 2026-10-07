import { reviewClassroom } from '../../core/classroomReview';
import type { LayoutDef } from '../../core/layouts';
import type { OptimizationResult, SeatingConstraints, Student } from '../../types';
import { getDisplayScorePct } from '../../utils/seatingUtils';
import type { OptimizationReport, SchoolCommand } from './types';

export function makeClassPublication(name: string, students: Student[], result: OptimizationResult | null | undefined,
  layout: LayoutDef, constraints: SeatingConstraints): Extract<SchoolCommand, { action: 'publish_class' }>['payload'] {
  const roster = new Set(students.map(s => s.id));
  const positions = result?.layout.seats.filter(s => s.student_id && roster.has(s.student_id)).map(s => ({
    localRef: s.student_id!, row: s.position.row, col: s.position.col,
    ...(s.position.x !== undefined && s.position.y !== undefined ? { x: s.position.x, y: s.position.y } : {}),
  })) ?? [];
  let optimization: OptimizationReport | null = null;
  if (result) {
    const review = reviewClassroom(result, students, constraints, layout);
    optimization = {
      version: 1, generatedAt: result.provenance?.generatedAt ?? new Date().toISOString(),
      score: getDisplayScorePct(result), objectives: { ...result.objective_scores },
      seated: new Set(positions.map(p => p.localRef)).size, missing: review.missing.length,
      needsAttention: review.affected.length, requiredAttention: review.requiredStudents,
      generations: result.generations, durationMs: Math.round(result.computation_time_ms),
      layoutType: layout.type, strategy: result.provenance?.config.examMode ? 'exam' : result.provenance?.config.seatingStrategy ?? 'mixed',
    };
  }
  // Explicit whitelist: personal scores, surveys, peer relations and notes stay on the device.
  return { name, students: students.map(s => ({ localRef: s.id, name: s.name })),
    snapshot: { rows: Math.max(layout.rows, ...positions.map(p => p.row + 1)), cols: Math.max(layout.cols, ...positions.map(p => p.col + 1)), positions }, optimization };
}
