import { useState } from 'react';
import { UserPlus, Keyboard, FileSpreadsheet, GraduationCap, Database } from 'lucide-react';
import clsx from 'clsx';
import SidebarSection from '../../components/SidebarSection';
import StudentForm from '../students/StudentForm';
import CsvImport from './CsvImport';
import GoogleClassroomImport from './GoogleClassroomImport';
import OneRosterImport from './OneRosterImport';
import { useLanguage } from '../../hooks/useLanguage';
import { useStore } from '../../core/store';

type Tab = 'manual' | 'csv' | 'google' | 'oneroster';

/**
 * One collapsible "Add students" section that unifies the four ways in —
 * typing, CSV, Google Classroom, OneRoster — behind tabs, instead of stacking
 * four separate blocks down the sidebar. Opens by default only when the class
 * is empty, so a first-run teacher lands on it but a loaded class stays tidy.
 */
export default function AddStudentsPanel() {
  const { t } = useLanguage();
  const studentCount = useStore((s) => s.students.length);
  // Default to CSV — importing a file (or the sample template) is the fastest
  // way to fill a real class; typing one-by-one is the fallback.
  const [tab, setTab] = useState<Tab>('csv');

  const tabs: { id: Tab; label: string; icon: typeof Keyboard }[] = [
    { id: 'manual', label: t('addStudents.tab_manual'), icon: Keyboard },
    { id: 'csv', label: t('addStudents.tab_csv'), icon: FileSpreadsheet },
    { id: 'google', label: t('addStudents.tab_google'), icon: GraduationCap },
    { id: 'oneroster', label: t('addStudents.tab_oneroster'), icon: Database },
  ];

  return (
    <SidebarSection title={t('addStudents.title')} icon={UserPlus} defaultOpen={studentCount === 0}>
      <div role="tablist" aria-label={t('addStudents.title')} className="flex flex-wrap gap-1 mb-3">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              tab === id
                ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-400 text-primary-700 dark:text-primary-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
            )}
          >
            <Icon size={13} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'manual' && <StudentForm />}
        {tab === 'csv' && <CsvImport />}
        {tab === 'google' && <GoogleClassroomImport />}
        {tab === 'oneroster' && <OneRosterImport />}
      </div>
    </SidebarSection>
  );
}
