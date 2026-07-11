import { useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp, Save, Trash2, Check, Pencil } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { getDisplayScorePct } from '../../utils/seatingUtils';
import type { SavedArrangement } from '../../types';

/**
 * Save multiple named seating arrangements for the current class and switch
 * between them. A snapshot of the current optimization result is stored under
 * a label; loading one shows it on the grid (export/print follow) without
 * polluting the rolling run history.
 */
export default function ArrangementsPanel() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const result = useStore((s) => s.result);
  const arrangements = useStore((s) => s.savedArrangements);
  const activeId = useStore((s) => s.activeArrangementId);
  const saveArrangement = useStore((s) => s.saveArrangement);
  const loadArrangement = useStore((s) => s.loadArrangement);
  const deleteArrangement = useStore((s) => s.deleteArrangement);
  const renameArrangement = useStore((s) => s.renameArrangement);

  const handleSave = () => {
    if (!result) return;
    const name = saveName.trim() || `${t('arrangements.default_name')} ${arrangements.length + 1}`;
    saveArrangement(name);
    setSaveName('');
  };

  const startEdit = (a: SavedArrangement) => {
    setEditingId(a.id);
    setEditName(a.name);
  };
  const commitEdit = () => {
    if (editingId && editName.trim()) renameArrangement(editingId, editName.trim());
    setEditingId(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Bookmark size={18} className="text-gray-500 dark:text-gray-400" />
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('arrangements.title')}</span>
          {arrangements.length > 0 && (
            <span className="ml-1.5 text-xs text-gray-500 dark:text-gray-400">({arrangements.length})</span>
          )}
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="p-4 pt-0 space-y-3">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{t('arrangements.description')}</p>

          {/* Save current */}
          {result ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder={t('arrangements.name_placeholder')}
                className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-primary-400 focus:border-primary-400 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
              />
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-primary-600 shrink-0"
              >
                <Save size={14} />
                {t('arrangements.save')}
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700">
              {t('arrangements.optimize_first')}
            </p>
          )}

          {/* List */}
          {arrangements.length > 0 && (
            <ul className="space-y-1.5">
              {arrangements.map((a) => {
                const isActive = a.id === activeId;
                return (
                  <li
                    key={a.id}
                    className={clsx(
                      'flex items-center gap-2 rounded-lg border px-2.5 py-1.5',
                      isActive ? 'bg-primary-50 border-primary-200' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                    )}
                  >
                    {editingId === a.id ? (
                      <>
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-900 dark:text-gray-100"
                        />
                        <button onClick={commitEdit} aria-label={t('arrangements.save')} className="p-1 text-green-600 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/40 rounded">
                          <Check size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => loadArrangement(a.id)}
                          className="flex-1 min-w-0 text-left"
                          aria-pressed={isActive}
                        >
                          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{a.name}</span>
                          <span className="block text-[10px] text-gray-400 dark:text-gray-400">
                            {getDisplayScorePct(a.result)}% · {formatDate(a.createdAt)}
                          </span>
                        </button>
                        {isActive && (
                          <span className="text-[9px] uppercase tracking-wide text-primary-600 font-semibold shrink-0">
                            {t('arrangements.active')}
                          </span>
                        )}
                        <button onClick={() => startEdit(a)} aria-label={t('arrangements.rename')} className="p-1 text-gray-400 dark:text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded shrink-0">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteArrangement(a.id)} aria-label={t('arrangements.delete')} className="p-1 text-gray-400 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40 rounded shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
