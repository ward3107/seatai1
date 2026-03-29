import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { User, Trash2, Edit2, Search, X, Filter } from 'lucide-react';
import clsx from 'clsx';
import type { AcademicLevel, BehaviorLevel } from '../../types';

type FilterLevel = 'all' | AcademicLevel | BehaviorLevel;

export default function StudentList() {
  const { students, selectedStudentId, setSelectedStudentId, removeStudent } = useStore();
  const { t } = useLanguage();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [filterType, setFilterType] = useState<'academic' | 'behavior'>('academic');

  const filtered = useMemo(() => {
    let list = students;

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.primary_language?.toLowerCase().includes(q)
      );
    }

    if (filter !== 'all') {
      if (filterType === 'academic') {
        list = list.filter(s => s.academic_level === filter);
      } else {
        list = list.filter(s => s.behavior_level === filter);
      }
    }

    return list;
  }, [students, query, filter, filterType]);

  const academicFilters: { value: FilterLevel; label: string }[] = [
    { value: 'all', label: t('students.filter_all') },
    { value: 'advanced', label: t('students.filter_advanced') },
    { value: 'proficient', label: t('students.filter_proficient') },
    { value: 'basic', label: t('students.filter_basic') },
    { value: 'below_basic', label: t('students.filter_below_basic') },
  ];

  const behaviorFilters: { value: FilterLevel; label: string }[] = [
    { value: 'all', label: t('students.filter_all') },
    { value: 'excellent', label: t('students.filter_excellent') },
    { value: 'good', label: t('students.filter_good') },
    { value: 'average', label: t('students.filter_average') },
    { value: 'challenging', label: t('students.filter_challenging') },
  ];

  const activeFilters = filterType === 'academic' ? academicFilters : behaviorFilters;

  const specialBadge = (student: typeof students[0]) => {
    if (student.has_mobility_issues) return '♿';
    if (student.requires_front_row) return '⭐';
    if (student.requires_quiet_area) return '🔇';
    if (student.special_needs.length > 0) return '📚';
    return null;
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">{t('students.title')}</h2>
        <span className="text-sm text-gray-500">
          {filtered.length}{filtered.length !== students.length ? `/${students.length}` : ''} {t('students.total')}
        </span>
      </div>

      {/* Search */}
      {students.length > 0 && (
        <div className="space-y-2 mb-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('students.search_placeholder')}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter type toggle + chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterType(t => t === 'academic' ? 'behavior' : 'academic')}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-1.5 py-0.5 border border-gray-300 rounded bg-white"
              title={t('students.toggle_filter')}
            >
              <Filter size={10} />
              {filterType === 'academic' ? t('students.academic') : t('students.behavior')}
            </button>
            {activeFilters.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(f => f === value ? 'all' : value)}
                className={clsx(
                  'px-2 py-0.5 rounded-full text-xs border transition-colors',
                  filter === value
                    ? 'bg-primary-100 border-primary-400 text-primary-700'
                    : 'border-gray-300 text-gray-500 hover:border-gray-400'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-1.5 max-h-64 overflow-auto">
        <AnimatePresence initial={false}>
          {filtered.map((student) => (
            <motion.div
              key={student.id}
              layout
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.15 }}
              className={clsx(
                'flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors',
                selectedStudentId === student.id
                  ? 'bg-primary-100 border-2 border-primary-300'
                  : 'bg-white hover:bg-gray-100 border-2 border-transparent'
              )}
              onClick={() => setSelectedStudentId(student.id)}
            >
              {/* Avatar */}
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0',
                student.gender === 'male' ? 'bg-blue-400'
                  : student.gender === 'female' ? 'bg-pink-400'
                  : 'bg-purple-400'
              )}>
                {student.name.charAt(0) || '?'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate text-sm">
                  {student.name || 'Unnamed'}
                  {specialBadge(student) && (
                    <span className="ml-1 text-xs">{specialBadge(student)}</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {student.academic_level} · {student.behavior_level}
                  {student.primary_language && ` · ${student.primary_language}`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-0.5 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedStudentId(student.id); }}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Edit"
                >
                  <Edit2 size={13} className="text-gray-500" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeStudent(student.id); }}
                  className="p-1.5 hover:bg-red-100 rounded transition-colors"
                  title="Remove"
                >
                  <Trash2 size={13} className="text-red-500" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {students.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <User size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('students.no_students_yet')}</p>
            <p className="text-xs">{t('students.add_students_or_import')}</p>
          </div>
        )}

        {students.length > 0 && filtered.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <Search size={24} className="mx-auto mb-1.5 opacity-50" />
            <p className="text-sm">{t('students.no_students_match')}</p>
            <button onClick={() => { setQuery(''); setFilter('all'); }} className="text-xs text-primary-500 underline mt-1">
              {t('students.clear_filters')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
