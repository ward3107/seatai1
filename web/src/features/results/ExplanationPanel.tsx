import { useState } from 'react';
import { ChevronDown, ChevronUp, Info, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import type { Student } from '../../types';

// ─── per-student reason builder ────────────────────────────────────────────

interface Reason {
  type: 'good' | 'warn' | 'info';
  text: string;
}

function buildReasons(
  student: Student,
  row: number,
  col: number,
  rows: number,
  allStudents: Map<string, Student>,
  adjacentIds: string[],
  constraints: { separate_pairs: [string, string][]; keep_together_pairs: [string, string][]; front_row_ids: string[]; back_row_ids: string[] },
  t: (key: string, values?: Record<string, string | number>) => string
): Reason[] {
  const reasons: Reason[] = [];

  // ── Accessibility placement ──
  if (student.requires_front_row && row === 0) {
    reasons.push({ type: 'good', text: t('explanation.reason_front_row_accessibility') });
  }
  if (student.has_mobility_issues && row <= 1) {
    reasons.push({ type: 'good', text: t('explanation.reason_accessible_seat') });
  }
  if (constraints.front_row_ids.includes(student.id) && row === 0) {
    reasons.push({ type: 'good', text: t('explanation.reason_front_row_teacher') });
  }
  if (constraints.back_row_ids.includes(student.id) && row >= rows - 2) {
    reasons.push({ type: 'good', text: t('explanation.reason_back_row_teacher') });
  }

  // ── Special needs notes ──
  for (const need of student.special_needs) {
    if (need.requires_front_seat && row === 0) {
      reasons.push({ type: 'good', text: t('explanation.reason_front_seat_for', { type: need.type }) });
    } else if (need.requires_front_seat && row > 0) {
      reasons.push({ type: 'warn', text: t('explanation.reason_prefers_front_seat', { type: need.type, row: row + 1 }) });
    }
  }
  if (student.requires_quiet_area) {
    if (row >= rows - 2) {
      reasons.push({ type: 'good', text: t('explanation.reason_quiet_area_back') });
    } else if (!student.requires_front_row && !student.has_mobility_issues) {
      reasons.push({ type: 'warn', text: t('explanation.reason_quiet_area_not_met') });
    }
  }

  // ── Adjacency: friends & conflicts ──
  for (const adjId of adjacentIds) {
    const adj = allStudents.get(adjId);
    if (!adj) continue;

    const isIncompFwd = student.incompatible_ids.includes(adjId);
    const isIncompRev = adj.incompatible_ids.includes(student.id);
    if (isIncompFwd || isIncompRev) {
      reasons.push({ type: 'warn', text: t('explanation.reason_adjacent_conflict', { name: adj.name }) });
      continue;
    }

    // Constraint pairs
    const isSep = constraints.separate_pairs.some(
      ([a, b]) => (a === student.id && b === adjId) || (b === student.id && a === adjId)
    );
    if (isSep) {
      reasons.push({ type: 'warn', text: t('explanation.reason_must_separate_violated', { name: adj.name }) });
      continue;
    }

    const isTog = constraints.keep_together_pairs.some(
      ([a, b]) => (a === student.id && b === adjId) || (b === student.id && a === adjId)
    );
    if (isTog) {
      reasons.push({ type: 'good', text: t('explanation.reason_kept_together', { name: adj.name }) });
      continue;
    }

    if (student.friends_ids.includes(adjId) || adj.friends_ids.includes(student.id)) {
      reasons.push({ type: 'good', text: t('explanation.reason_seated_near_friend', { name: adj.name }) });
    }
  }

  // ── Separation rules fulfilled ──
  for (const [a, b] of constraints.separate_pairs) {
    const otherId = a === student.id ? b : b === student.id ? a : null;
    if (!otherId) continue;
    if (!adjacentIds.includes(otherId)) {
      const other = allStudents.get(otherId);
      if (other) reasons.push({ type: 'good', text: t('explanation.reason_separated_from', { name: other.name }) });
    }
  }

  if (reasons.length === 0) {
    reasons.push({ type: 'info', text: t('explanation.reason_location', { row: row + 1, seat: col + 1 }) });
  }

  return reasons;
}

// ─── helper: find adjacent student ids for a seat ──────────────────────────

function getAdjacentIds(
  row: number,
  col: number,
  seats: { position: { row: number; col: number }; student_id?: string }[]
): string[] {
  const adjacent: string[] = [];
  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of offsets) {
    const seat = seats.find(
      (s) => s.position.row === row + dr && s.position.col === col + dc
    );
    if (seat?.student_id) adjacent.push(seat.student_id);
  }
  return adjacent;
}

// ─── main component ─────────────────────────────────────────────────────────

export default function ExplanationPanel() {
  const { result, students, rows, constraints } = useStore();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');

  if (!result) return null;

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const seats = result.layout.seats;

  // Count warnings for badge
  let warnCount = 0;

  const entries = students
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .map((student) => {
      const seat = seats.find((s) => s.student_id === student.id);
      if (!seat) return null;
      const { row, col } = seat.position;
      const adjIds = getAdjacentIds(row, col, seats);
      const reasons = buildReasons(student, row, col, rows, studentMap, adjIds, constraints, t);
      const hasWarn = reasons.some((r) => r.type === 'warn');
      if (hasWarn) warnCount++;
      return { student, row, col, reasons, hasWarn };
    })
    .filter(Boolean) as {
      student: Student;
      row: number;
      col: number;
      reasons: Reason[];
      hasWarn: boolean;
    }[];

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden mb-6">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Info size={16} className="text-indigo-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-800 text-sm">{t('explanation.title')}</p>
            <p className="text-xs text-gray-500">
              {t('explanation.subtitle')}
            </p>
          </div>
          {warnCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full flex items-center gap-1">
              <AlertTriangle size={10} />
              {warnCount} {t('explanation.issues')}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-gray-100 p-4">
          {/* Search */}
          <div className="mb-4 relative">
            <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('explanation.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {entries.map(({ student, row, col, reasons, hasWarn }) => (
              <div
                key={student.id}
                className={clsx(
                  'rounded-xl border p-3',
                  hasWarn
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-gray-200 bg-gray-50'
                )}
              >
                {/* Student header */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
                      student.gender === 'male'
                        ? 'bg-blue-400'
                        : student.gender === 'female'
                        ? 'bg-pink-400'
                        : 'bg-purple-400'
                    )}
                  >
                    {student.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      {student.name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {t('explanation.row_seat', { row: row + 1, seat: col + 1 })}
                    </p>
                  </div>
                </div>

                {/* Reasons */}
                <ul className="space-y-1">
                  {reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px]">
                      {r.type === 'good' ? (
                        <CheckCircle2 size={11} className="text-emerald-500 mt-0.5 shrink-0" />
                      ) : r.type === 'warn' ? (
                        <AlertTriangle size={11} className="text-amber-500 mt-0.5 shrink-0" />
                      ) : (
                        <Info size={11} className="text-gray-400 mt-0.5 shrink-0" />
                      )}
                      <span
                        className={clsx(
                          r.type === 'good'
                            ? 'text-emerald-700'
                            : r.type === 'warn'
                            ? 'text-amber-700'
                            : 'text-gray-500'
                        )}
                      >
                        {r.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {entries.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">{t('explanation.no_match', { search })}</p>
          )}
        </div>
      )}
    </div>
  );
}
