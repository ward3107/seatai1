import { useState } from 'react';
import { ChevronDown, ChevronUp, Info, CheckCircle2, AlertTriangle, Users, Heart } from 'lucide-react';
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

// ─── helper: calculate compatibility score between two students ─────────────────

function calculatePairCompatibility(
  studentA: Student,
  studentB: Student,
  allStudents: Map<string, Student>
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Friendship (strong positive factor)
  const isFriends = studentA.friends_ids.includes(studentB.id) || studentB.friends_ids.includes(studentA.id);
  if (isFriends) {
    score += 30;
    reasons.push('👫 Friends');
  }

  // Gender diversity (mild positive)
  if (studentA.gender !== studentB.gender) {
    score += 5;
    reasons.push('👥 Mixed gender');
  }

  // Academic compatibility (prefer similar levels for peer support)
  const academicDiff = Math.abs(studentA.academic_score - studentB.academic_score);
  if (academicDiff <= 15) {
    score += 15;
    reasons.push('📚 Similar academic levels');
  } else if (academicDiff <= 30) {
    score += 5;
    reasons.push('📚 Compatible academic levels');
  }

  // Behavioral compatibility
  const behaviorDiff = Math.abs(studentA.behavior_score - studentB.behavior_score);
  if (behaviorDiff <= 15) {
    score += 15;
    reasons.push('😊 Similar behavior levels');
  } else if (behaviorDiff <= 30) {
    score += 5;
    reasons.push('😊 Compatible behavior');
  }

  // Both need front row
  if (studentA.requires_front_row && studentB.requires_front_row) {
    score += 10;
    reasons.push('⭐ Both need front row');
  }

  // Both need quiet area
  if (studentA.requires_quiet_area && studentB.requires_quiet_area) {
    score += 10;
    reasons.push('🔇 Both prefer quiet');
  }

  // No conflicts
  const hasConflict = studentA.incompatible_ids.includes(studentB.id) || studentB.incompatible_ids.includes(studentA.id);
  if (!hasConflict) {
    score += 20;
    reasons.push('✓ No conflicts');
  }

  // Same language support
  if (studentA.is_bilingual && studentB.is_bilingual) {
    score += 5;
    reasons.push('🌐 Both bilingual');
  }

  return { score, reasons };
}

// ─── helper: group students into pairs ────────────────────────────────────────

interface StudentPair {
  studentA: Student;
  studentB: Student | null;
  row: number;
  col: number;
  col2: number | null;
}

function groupIntoPairs(
  seats: { position: { row: number; col: number }; student_id?: string }[],
  students: Map<string, Student>
): StudentPair[] {
  const pairs: StudentPair[] = [];
  const processed = new Set<string>();

  for (const seat of seats) {
    if (!seat.student_id) continue;
    if (processed.has(seat.student_id)) continue;

    const student = students.get(seat.student_id);
    if (!student) continue;

    processed.add(seat.student_id);

    // Check if there's a student to the right (pairs are grouped by columns 2)
    const rightSeat = seats.find(
      (s) => s.position.row === seat.position.row && s.position.col === seat.position.col + 1
    );

    if (rightSeat?.student_id && !processed.has(rightSeat.student_id)) {
      const studentB = students.get(rightSeat.student_id);
      if (studentB) {
        processed.add(rightSeat.student_id);
        pairs.push({
          studentA: student,
          studentB: studentB,
          row: seat.position.row,
          col: seat.position.col,
          col2: rightSeat.position.col,
        });
        continue;
      }
    }

    // Student without a pair (odd number of students)
    pairs.push({
      studentA: student,
      studentB: null,
      row: seat.position.row,
      col: seat.position.col,
      col2: null,
    });
  }

  return pairs;
}

// ─── main component ─────────────────────────────────────────────────────────

export default function ExplanationPanel() {
  const { result, students, rows, constraints, viewMode } = useStore();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');

  if (!result) return null;

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const seats = result.layout.seats;
  const isPairsMode = viewMode === 'pairs';

  // Count warnings for badge
  let warnCount = 0;

  let content: React.ReactNode;

  if (isPairsMode) {
    // ── Pairs view: show desk-by-desk explanations ───────────────────────
    const pairs = groupIntoPairs(seats, studentMap);

    const filteredPairs = pairs.filter(({ studentA, studentB }) =>
      studentA.name.toLowerCase().includes(search.toLowerCase()) ||
      (studentB?.name.toLowerCase().includes(search.toLowerCase()) ?? false)
    );

    content = (
      <>
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

        {/* Pair cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPairs.map(({ studentA, studentB, row, col }) => {
            const compatibility = studentB
              ? calculatePairCompatibility(studentA, studentB, studentMap)
              : { score: 0, reasons: [studentA.name + ' (unpaired)'] };

            const hasWarn = compatibility.score < 30;
            if (hasWarn) warnCount++;

            return (
              <div
                key={studentA.id + (studentB?.id || '')}
                className={clsx(
                  'rounded-xl border p-4',
                  hasWarn
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-green-200 bg-green-50'
                )}
              >
                {/* Compatibility score badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-600">
                    {row + 1}-{col + 1}
                    {studentB && ` - ${row + 1}-${col + 2}`}
                  </span>
                  <span
                    className={clsx(
                      'px-2 py-1 rounded-lg text-xs font-bold',
                      compatibility.score >= 70
                        ? 'bg-green-500 text-white'
                        : compatibility.score >= 40
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-400 text-white'
                    )}
                  >
                    {compatibility.score}%
                  </span>
                </div>

                {/* Students in pair */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex -space-x-2">
                    {/* Student A */}
                    <div
                      className={clsx(
                        'w-10 h-10 rounded-full border-2 flex items-center justify-center text-white text-sm font-bold',
                        studentA.gender === 'male'
                          ? 'bg-blue-400 border-white'
                          : studentA.gender === 'female'
                            ? 'bg-pink-400 border-white'
                            : 'bg-purple-400 border-white'
                      )}
                    >
                      {studentA.name.charAt(0)}
                    </div>
                    {/* Student B */}
                    {studentB && (
                      <div
                        className={clsx(
                          'w-10 h-10 rounded-full border-2 flex items-center justify-center text-white text-sm font-bold',
                          studentB.gender === 'male'
                            ? 'bg-blue-400 border-white'
                            : studentB.gender === 'female'
                              ? 'bg-pink-400 border-white'
                              : 'bg-purple-400 border-white'
                        )}
                      >
                        {studentB.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {studentA.name}
                      {studentB && ` & ${studentB.name}`}
                    </p>
                  </div>
                </div>

                {/* Reasons for pairing */}
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase font-medium">
                    {studentB ? 'Why paired together:' : 'Seat status:'}
                  </p>
                  {compatibility.reasons.map((reason, i) => (
                    <div key={i} className={clsx(
                      'text-xs px-2 py-1 rounded-md',
                      reason.includes('Friends') ? 'bg-green-100 text-green-700' :
                      reason.includes('conflict') ? 'bg-red-100 text-red-700' :
                      reason.includes('No conflicts') ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    )}>
                      {reason}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {filteredPairs.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">{t('explanation.no_match', { search })}</p>
        )}
      </>
    );
  } else {
    // ── Rows view: show individual student explanations ────────────────────
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

    content = (
      <>
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
      </>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden mb-6">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            {isPairsMode ? (
              <Heart size={16} className="text-indigo-600" />
            ) : (
              <Info size={16} className="text-indigo-600" />
            )}
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-800 text-sm">
              {isPairsMode ? 'Pairing Explanations' : t('explanation.title')}
            </p>
            <p className="text-xs text-gray-500">
              {isPairsMode ? 'Why students were paired together' : t('explanation.subtitle')}
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
          {content}
        </div>
      )}
    </div>
  );
}
