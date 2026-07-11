import { useState } from 'react';
import { PenLine, Upload, GraduationCap, Database, Sparkles, Users } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { SAMPLE_CLASSES } from '../../utils/sampleData';
import StudentForm from '../students/StudentForm';
import StudentList from '../students/StudentList';
import CsvImport from '../import/CsvImport';
import GoogleClassroomImport from '../import/GoogleClassroomImport';
import OneRosterImport from '../import/OneRosterImport';

type Tab = 'manual' | 'csv' | 'classroom' | 'oneroster' | 'sample';

const TABS: { key: Tab; icon: typeof PenLine; labelKey: string }[] = [
  { key: 'manual', icon: PenLine, labelKey: 'wizard.tab_manual' },
  { key: 'csv', icon: Upload, labelKey: 'wizard.tab_csv' },
  { key: 'classroom', icon: GraduationCap, labelKey: 'wizard.tab_classroom' },
  { key: 'oneroster', icon: Database, labelKey: 'wizard.tab_oneroster' },
  { key: 'sample', icon: Sparkles, labelKey: 'wizard.tab_sample' },
];

export default function WizardStudents() {
  const { t } = useLanguage();
  const students = useStore((s) => s.students);
  const setStudents = useStore((s) => s.setStudents);
  const setLayoutDef = useStore((s) => s.setLayoutDef);
  const [tab, setTab] = useState<Tab>('manual');

  function loadSampleClass(id: (typeof SAMPLE_CLASSES)[number]['id']) {
    const sample = SAMPLE_CLASSES.find((c) => c.id === id);
    if (!sample) return;
    setStudents(JSON.parse(JSON.stringify(sample.students)));
    setLayoutDef({ type: 'rows', rows: sample.rows, cols: sample.cols });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('wizard.students_title')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('wizard.students_desc')}</p>
      </div>

      {/* Method tabs */}
      <div role="tablist" aria-label={t('wizard.students_title')} className="flex flex-wrap gap-1.5">
        {TABS.map(({ key, icon: Icon, labelKey }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={clsx(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              tab === key
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
            )}
          >
            <Icon size={15} />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Active method */}
      <div role="tabpanel" className="min-h-[8rem]">
        {tab === 'manual' && <StudentForm />}
        {tab === 'csv' && <CsvImport />}
        {tab === 'classroom' && <GoogleClassroomImport />}
        {tab === 'oneroster' && <OneRosterImport />}
        {tab === 'sample' && (
          <div className="flex flex-wrap gap-2">
            {SAMPLE_CLASSES.map((sample) => (
              <button
                key={sample.id}
                onClick={() => loadSampleClass(sample.id)}
                className="flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 transition-colors"
              >
                <Sparkles size={14} className="text-amber-500 dark:text-amber-400" />
                <span>{t(`onboarding.sample_${sample.id}` as const)}</span>
                <span className="text-xs text-gray-400 dark:text-gray-400">· {sample.students.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Running roster — always visible so progress is clear regardless of method */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Users size={15} className="text-gray-500 dark:text-gray-400" />
          {t('wizard.roster_count', { count: students.length })}
        </div>
        {students.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('wizard.roster_empty')}</p>
        ) : (
          <StudentList />
        )}
      </div>
    </div>
  );
}
