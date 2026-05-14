import { useMemo, useState } from 'react';
import {
  Users2,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Search,
  ArrowUpToLine,
  ArrowDownToLine,
  AlertTriangle,
  UserMinus,
  UserPlus,
  PanelLeft,
  Sun,
  GraduationCap,
} from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import type { SeatingConstraints, Student } from '../../types';

type PairField = 'separate_pairs' | 'keep_together_pairs' | 'peer_mentor_pairs';
type RowField =
  | 'front_row_ids'
  | 'back_row_ids'
  | 'aisle_ids'
  | 'near_window_ids';

// ── Helpers ──────────────────────────────────────────────────────────────────

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function pairsEqual(a: [string, string], b: [string, string]): boolean {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

// ── Searchable student picker ────────────────────────────────────────────────

interface StudentSearchProps {
  students: Student[];
  excludeIds?: string[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  ariaLabel: string;
}

function StudentSearch({
  students,
  excludeIds = [],
  value,
  onChange,
  placeholder,
  ariaLabel,
}: StudentSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => !excludeIds.includes(s.id))
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [students, excludeIds, query]);

  const selected = students.find((s) => s.id === value);

  return (
    <div className="relative flex-1">
      <div className="relative">
        <Search
          size={12}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={open ? query : selected?.name ?? ''}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
            if (value) onChange('');
          }}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onBlur={() => {
            // Close on next tick so click on option still fires
            setTimeout(() => setOpen(false), 120);
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="w-full text-xs pl-7 pr-2 py-1.5 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 left-0 right-0 max-h-44 overflow-auto bg-white border border-gray-200 rounded shadow-lg text-xs"
        >
          {filtered.map((s) => (
            <li key={s.id} role="option" aria-selected={s.id === value}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(s.id);
                  setOpen(false);
                  setQuery('');
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none"
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Pair picker ──────────────────────────────────────────────────────────────

interface PairPickerProps {
  students: Student[];
  pairs: [string, string][];
  onAdd: (a: string, b: string) => void;
  onRemove: (a: string, b: string) => void;
  label: string;
  description: string;
  icon: React.ReactNode;
  variant: 'separate' | 'together';
  t: (key: string) => string;
}

function PairPicker({
  students,
  pairs,
  onAdd,
  onRemove,
  label,
  description,
  icon,
  variant,
  t,
}: PairPickerProps) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');

  const handleAdd = () => {
    if (!a || !b || a === b) return;
    if (pairs.some((p) => pairsEqual(p, [a, b]))) return;
    onAdd(a, b);
    setA('');
    setB('');
  };

  const tone =
    variant === 'separate'
      ? {
          chip: 'bg-red-50 text-red-800 border-red-200',
          box: 'bg-red-50/40 border-red-100',
          icon: 'text-red-500',
        }
      : {
          chip: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          box: 'bg-emerald-50/40 border-emerald-100',
          icon: 'text-emerald-500',
        };

  const getName = (id: string) => students.find((s) => s.id === id)?.name ?? id;

  return (
    <section className={`rounded-lg border ${tone.box} p-3 space-y-2`}>
      <header className="flex items-start gap-2">
        <span className={tone.icon} aria-hidden="true">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-gray-800">{label}</h4>
          <p className="text-[11px] text-gray-500 leading-snug">{description}</p>
        </div>
        <span className="text-xs font-medium text-gray-500 tabular-nums">
          {pairs.length}
        </span>
      </header>

      {pairs.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={label}>
          {pairs.map(([x, y]) => (
            <li
              key={`${x}|${y}`}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${tone.chip}`}
            >
              <span className="truncate max-w-[6rem]">{firstName(getName(x))}</span>
              <span className="opacity-50">↔</span>
              <span className="truncate max-w-[6rem]">{firstName(getName(y))}</span>
              <button
                type="button"
                onClick={() => onRemove(x, y)}
                className="ml-0.5 hover:opacity-70 focus:outline-none focus:ring-1 focus:ring-gray-400 rounded"
                aria-label={t('constraints.remove_pair')}
              >
                <X size={10} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-1.5">
        <StudentSearch
          students={students}
          excludeIds={b ? [b] : []}
          value={a}
          onChange={setA}
          placeholder={t('constraints.student_a')}
          ariaLabel={t('constraints.student_a')}
        />
        <span className="text-xs text-gray-400" aria-hidden="true">
          ↔
        </span>
        <StudentSearch
          students={students}
          excludeIds={a ? [a] : []}
          value={b}
          onChange={setB}
          placeholder={t('constraints.student_b')}
          ariaLabel={t('constraints.student_b')}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!a || !b || a === b}
          className="p-1.5 bg-gray-800 text-white rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label={t('constraints.add_pair')}
        >
          <Plus size={12} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

// ── Row-assign picker ────────────────────────────────────────────────────────

interface RowPickerProps {
  students: Student[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  label: string;
  description: string;
  icon: React.ReactNode;
  variant: 'front' | 'back';
  t: (key: string) => string;
}

function RowPicker({
  students,
  selectedIds,
  onToggle,
  label,
  description,
  icon,
  variant,
  t,
}: RowPickerProps) {
  const [query, setQuery] = useState('');

  const tone =
    variant === 'front'
      ? {
          on: 'bg-indigo-100 border-indigo-400 text-indigo-900',
          box: 'bg-indigo-50/40 border-indigo-100',
          icon: 'text-indigo-500',
        }
      : {
          on: 'bg-amber-100 border-amber-400 text-amber-900',
          box: 'bg-amber-50/40 border-amber-100',
          icon: 'text-amber-500',
        };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [students, query]);

  return (
    <section className={`rounded-lg border ${tone.box} p-3 space-y-2`}>
      <header className="flex items-start gap-2">
        <span className={tone.icon} aria-hidden="true">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-gray-800">{label}</h4>
          <p className="text-[11px] text-gray-500 leading-snug">{description}</p>
        </div>
        <span className="text-xs font-medium text-gray-500 tabular-nums">
          {selectedIds.length}
        </span>
      </header>

      {students.length > 10 && (
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('constraints.search_students')}
            aria-label={t('constraints.search_students')}
            className="w-full text-xs pl-7 pr-2 py-1.5 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
        {filtered.map((s) => {
          const on = selectedIds.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s.id)}
              aria-pressed={on}
              className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                on ? tone.on : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {firstName(s.name)}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-[11px] text-gray-400 italic">
            {t('constraints.no_match')}
          </p>
        )}
      </div>
    </section>
  );
}

// ── Conflict detection ───────────────────────────────────────────────────────

interface Conflict {
  message: string;
  studentIds: string[];
}

function detectConflicts(
  constraints: SeatingConstraints,
  students: Student[],
  t: (key: string, vars?: Record<string, string | number>) => string,
): Conflict[] {
  const conflicts: Conflict[] = [];
  const nameOf = (id: string) =>
    firstName(students.find((s) => s.id === id)?.name ?? id);

  // 1. Same pair in both separate and keep-together lists
  for (const [a, b] of constraints.separate_pairs) {
    if (constraints.keep_together_pairs.some((p) => pairsEqual(p, [a, b]))) {
      conflicts.push({
        message: t('constraints.conflict_pair_both', {
          a: nameOf(a),
          b: nameOf(b),
        }),
        studentIds: [a, b],
      });
    }
  }

  // 2. Student in both front_row_ids and back_row_ids
  for (const id of constraints.front_row_ids) {
    if (constraints.back_row_ids.includes(id)) {
      conflicts.push({
        message: t('constraints.conflict_front_and_back', { name: nameOf(id) }),
        studentIds: [id],
      });
    }
  }

  // 3. Student flagged requires_front_row in app but assigned to back row
  for (const id of constraints.back_row_ids) {
    const s = students.find((x) => x.id === id);
    if (s?.requires_front_row) {
      conflicts.push({
        message: t('constraints.conflict_back_vs_accessibility', {
          name: nameOf(id),
        }),
        studentIds: [id],
      });
    }
  }

  // 4. Duplicate pair on the same list (shouldn't happen, but guard)
  const seen = new Set<string>();
  for (const [a, b] of [
    ...constraints.separate_pairs,
    ...constraints.keep_together_pairs,
  ]) {
    const key = [a, b].sort().join('|');
    if (seen.has(key)) {
      conflicts.push({
        message: t('constraints.conflict_duplicate_pair', {
          a: nameOf(a),
          b: nameOf(b),
        }),
        studentIds: [a, b],
      });
    }
    seen.add(key);
  }

  return conflicts;
}

// ── Main panel ───────────────────────────────────────────────────────────────

export default function ConstraintsPanel() {
  const { constraints, setConstraints, students } = useStore();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const totalRules =
    constraints.separate_pairs.length +
    constraints.keep_together_pairs.length +
    constraints.front_row_ids.length +
    constraints.back_row_ids.length +
    (constraints.aisle_ids?.length ?? 0) +
    (constraints.near_window_ids?.length ?? 0) +
    (constraints.peer_mentor_pairs?.length ?? 0);

  const conflicts = useMemo(
    () => detectConflicts(constraints, students, t),
    [constraints, students, t],
  );

  const addPair = (field: PairField) => (a: string, b: string) =>
    setConstraints({
      ...constraints,
      [field]: [...(constraints[field] ?? []), [a, b] as [string, string]],
    });

  const removePair = (field: PairField) => (a: string, b: string) =>
    setConstraints({
      ...constraints,
      [field]: (constraints[field] ?? []).filter((p) => !pairsEqual(p, [a, b])),
    });

  const toggleRowId = (field: RowField) => (id: string) => {
    const list = constraints[field] ?? [];
    setConstraints({
      ...constraints,
      [field]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    });
  };

  const clearAll = () =>
    setConstraints({
      separate_pairs: [],
      keep_together_pairs: [],
      aisle_ids: [],
      near_window_ids: [],
      peer_mentor_pairs: [],
      front_row_ids: [],
      back_row_ids: [],
    });

  return (
    <div className="bg-gray-50 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
        aria-expanded={open}
        aria-controls="constraints-panel-body"
      >
        <div className="flex items-center gap-2">
          <Users2 size={18} className="text-gray-500" aria-hidden="true" />
          <span className="font-medium text-gray-700">
            {t('constraints.title')}
          </span>
          {totalRules > 0 && (
            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs tabular-nums">
              {totalRules}
            </span>
          )}
          {conflicts.length > 0 && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs"
              title={t('constraints.has_conflicts')}
            >
              <AlertTriangle size={10} aria-hidden="true" />
              {conflicts.length}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp size={18} aria-hidden="true" />
        ) : (
          <ChevronDown size={18} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div id="constraints-panel-body" className="p-4 pt-0 space-y-3">
          {students.length < 2 ? (
            <p className="text-xs text-gray-400 italic p-3 bg-white rounded-lg border border-gray-200">
              {t('constraints.need_more_students')}
            </p>
          ) : (
            <>
              {conflicts.length > 0 && (
                <div
                  className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1"
                  role="alert"
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <AlertTriangle size={12} aria-hidden="true" />
                    {t('constraints.conflicts_heading')}
                  </div>
                  <ul className="text-[11px] text-amber-900 list-disc list-inside space-y-0.5">
                    {conflicts.map((c, i) => (
                      <li key={i}>{c.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <PairPicker
                students={students}
                pairs={constraints.separate_pairs}
                onAdd={addPair('separate_pairs')}
                onRemove={removePair('separate_pairs')}
                label={t('constraints.must_separate')}
                description={t('constraints.must_separate_desc')}
                icon={<UserMinus size={14} />}
                variant="separate"
                t={t}
              />

              <PairPicker
                students={students}
                pairs={constraints.keep_together_pairs}
                onAdd={addPair('keep_together_pairs')}
                onRemove={removePair('keep_together_pairs')}
                label={t('constraints.should_sit_near')}
                description={t('constraints.should_sit_near_desc')}
                icon={<UserPlus size={14} />}
                variant="together"
                t={t}
              />

              <RowPicker
                students={students}
                selectedIds={constraints.front_row_ids}
                onToggle={toggleRowId('front_row_ids')}
                label={t('constraints.force_front_row')}
                description={t('constraints.force_front_row_desc')}
                icon={<ArrowUpToLine size={14} />}
                variant="front"
                t={t}
              />

              <RowPicker
                students={students}
                selectedIds={constraints.back_row_ids}
                onToggle={toggleRowId('back_row_ids')}
                label={t('constraints.prefer_back_row')}
                description={t('constraints.prefer_back_row_desc')}
                icon={<ArrowDownToLine size={14} />}
                variant="back"
                t={t}
              />

              <RowPicker
                students={students}
                selectedIds={constraints.aisle_ids ?? []}
                onToggle={toggleRowId('aisle_ids')}
                label={t('constraints.on_aisle')}
                description={t('constraints.on_aisle_desc')}
                icon={<PanelLeft size={14} />}
                variant="back"
                t={t}
              />

              <RowPicker
                students={students}
                selectedIds={constraints.near_window_ids ?? []}
                onToggle={toggleRowId('near_window_ids')}
                label={t('constraints.near_window')}
                description={t('constraints.near_window_desc')}
                icon={<Sun size={14} />}
                variant="front"
                t={t}
              />

              <PairPicker
                students={students}
                pairs={constraints.peer_mentor_pairs ?? []}
                onAdd={addPair('peer_mentor_pairs')}
                onRemove={removePair('peer_mentor_pairs')}
                label={t('constraints.peer_mentor')}
                description={t('constraints.peer_mentor_desc')}
                icon={<GraduationCap size={14} />}
                variant="together"
                t={t}
              />

              {totalRules > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-red-600 hover:text-red-800 underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                >
                  {t('constraints.clear_all')}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
