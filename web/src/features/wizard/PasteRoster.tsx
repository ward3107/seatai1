import { useId, useState } from 'react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { createEmptyStudent } from '../../utils/sampleData';
import { parsePastedNames } from './parsePastedNames';

export default function PasteRoster() {
  const { t } = useLanguage();
  const id = useId();
  const students = useStore((s) => s.students);
  const setStudents = useStore((s) => s.setStudents);
  const [text, setText] = useState('');
  const [added, setAdded] = useState(0);
  const names = parsePastedNames(text);
  const repeated = names.length !== new Set(names).size;

  function addNames() {
    if (!names.length) return;
    // Read the latest roster to preserve edits made while this panel was open.
    const current = useStore.getState().students;
    setStudents([...current, ...names.map((name) => ({ ...createEmptyStudent(), name }))]);
    setAdded(names.length);
    setText('');
  }

  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block text-sm font-medium">{t('pasteRoster.label')}</label>
      <p id={`${id}-hint`} className="text-sm text-gray-500 dark:text-gray-400">{t('pasteRoster.hint')}</p>
      <textarea id={id} aria-describedby={`${id}-hint`} rows={6} value={text}
        onChange={(event) => { setText(event.target.value); setAdded(0); }}
        className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
      {names.length > 0 && (
        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <p className="text-sm font-medium">{t('pasteRoster.preview', { count: names.length })}</p>
          <ol className="mt-2 max-h-40 list-inside list-decimal overflow-auto text-sm">
            {names.map((name, index) => <li key={index} dir="auto">{name}</li>)}
          </ol>
          {repeated && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{t('pasteRoster.repeated')}</p>}
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">{t('pasteRoster.defaults')}</p>
      <button type="button" disabled={!names.length} onClick={addNames}
        className="min-h-11 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40">
        {t('pasteRoster.add', { count: names.length })}
      </button>
      <p role="status" className="text-sm text-gray-600 dark:text-gray-300">
        {added > 0 ? t('pasteRoster.success', { count: added }) : t('pasteRoster.append', { count: students.length })}
      </p>
    </div>
  );
}
