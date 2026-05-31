import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { getDisplayScorePct } from '../../utils/seatingUtils';
import { FolderOpen, Save, Trash2, Check, X, Plus, ChevronDown, ChevronUp, Pencil, DownloadCloud, UploadCloud, AlertTriangle } from 'lucide-react';
import type { ClassProject } from '../../types';
import { buildBackup, parseBackup, type BackupData } from './backup';

export default function ProjectManager() {
  const projects = useStore((s) => s.projects);
  const currentProjectId = useStore((s) => s.currentProjectId);
  const saveProject = useStore((s) => s.saveProject);
  const loadProject = useStore((s) => s.loadProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const renameProject = useStore((s) => s.renameProject);
  const students = useStore((s) => s.students);
  const { t } = useLanguage();

  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string>('');
  const [pendingRestore, setPendingRestore] = useState<
    { data: BackupData; exportedAt: string } | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentProject = projects.find(p => p.id === currentProjectId);

  const handleBackup = () => {
    // Pull a fresh snapshot from the store rather than relying on the
    // hooked values — guarantees the file matches the exact moment of
    // the click even if the user just edited something.
    const s = useStore.getState();
    const file = buildBackup({
      students: s.students,
      rows: s.rows,
      cols: s.cols,
      layoutDef: s.layoutDef,
      weights: s.weights,
      config: s.config,
      constraints: s.constraints,
      avoidRecentNeighbors: s.avoidRecentNeighbors,
      projects: s.projects,
      currentProjectId: s.currentProjectId,
      result: s.result,
      resultHistory: s.resultHistory,
      rotationPlan: s.rotationPlan,
      uiLanguage: s.uiLanguage,
      uiScale: s.uiScale,
      theme: s.theme,
      aiSettings: { enabled: s.aiSettings.enabled, model: s.aiSettings.model },
    });
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seatai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreFile = async (file: File) => {
    setRestoreError('');
    const text = await file.text();
    const result = parseBackup(text);
    if (!result.ok) {
      const key =
        result.kind === 'invalid-json'
          ? 'projects.restore_error_invalid_json'
          : result.kind === 'wrong-schema'
            ? 'projects.restore_error_wrong_schema'
            : result.kind === 'unsupported-version'
              ? 'projects.restore_error_unsupported_version'
              : 'projects.restore_error_missing_fields';
      setRestoreError(t(key));
      return;
    }
    setPendingRestore({ data: result.data, exportedAt: result.exportedAt });
  };

  const confirmRestore = () => {
    if (!pendingRestore) return;
    useStore.getState().restoreFromBackup(pendingRestore.data);
    setPendingRestore(null);
    setRestoreError('');
  };

  // Escape closes the destructive restore confirmation. The focus trap is
  // applied to the dialog itself further down.
  useEffect(() => {
    if (!pendingRestore) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingRestore(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pendingRestore]);

  const restoreDialogRef = useFocusTrap<HTMLDivElement>(!!pendingRestore);

  const handleSave = () => {
    const name = saveName.trim() || currentProject?.name || `${t('projects.class')} ${new Date().toLocaleDateString()}`;
    saveProject(name);
    setSaveName('');
  };

  const startEdit = (p: ClassProject) => {
    setEditingId(p.id);
    setEditName(p.name);
  };

  const commitEdit = () => {
    if (editingId && editName.trim()) {
      renameProject(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });

  return (
    <div className="bg-gray-50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FolderOpen size={18} className="text-gray-500" />
          <span className="font-medium text-gray-700">
            {t('projects.title')}
            {projects.length > 0 && (
              <span className="ml-1.5 text-xs text-gray-500">({projects.length})</span>
            )}
          </span>
          {currentProject && (
            <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
              {currentProject.name}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="p-4 pt-0 space-y-3">
          {/* Save current state */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={currentProject?.name ?? t('projects.class_placeholder')}
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            />
            <button
              onClick={handleSave}
              disabled={students.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={currentProject ? t('projects.update_project') : t('projects.save_as_new')}
            >
              <Save size={14} />
              {currentProject ? t('projects.update') : t('projects.save')}
            </button>
            {currentProject && (
              <button
                onClick={() => {
                  setSaveName('');
                  useStore.getState().saveProject(saveName.trim() || `${t('projects.class')} ${new Date().toLocaleDateString()}`);
                  // Actually make a new one by clearing currentProjectId first
                }}
                title={t('projects.save_as_new')}
                className="flex items-center gap-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          {/* Project list */}
          {projects.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-2">
              {t('projects.no_projects')}
            </p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-auto">
              {[...projects].reverse().map(p => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-colors ${
                    p.id === currentProjectId
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-transparent bg-white hover:bg-gray-50'
                  }`}
                >
                  {/* Name / edit */}
                  <div className="flex-1 min-w-0">
                    {editingId === p.id ? (
                      <div className="flex gap-1">
                        <input
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                          className="flex-1 text-sm px-1.5 py-0.5 border border-primary-400 rounded focus:outline-none"
                        />
                        <button onClick={commitEdit} className="text-green-600 hover:text-green-800"><Check size={13} /></button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">
                          {p.students.length} {t('app.students')} · {formatDate(p.updatedAt)}
                          {p.result && ` · ${t('app.score')}: ${getDisplayScorePct(p.result)}%`}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {editingId !== p.id && (
                    <div className="flex gap-0.5 shrink-0">
                      {p.id !== currentProjectId && (
                        <button
                          onClick={() => loadProject(p.id)}
                          className="px-2 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
                        >
                          {t('projects.load')}
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(p)}
                        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                        title={t('projects.rename')}
                      >
                        <Pencil size={12} className="text-gray-500" />
                      </button>
                      {confirmDelete === p.id ? (
                        <>
                          <button onClick={() => { deleteProject(p.id); setConfirmDelete(null); }}
                            className="p-1.5 bg-red-100 hover:bg-red-200 rounded transition-colors">
                            <Check size={12} className="text-red-600" />
                          </button>
                          <button onClick={() => setConfirmDelete(null)}
                            className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                            <X size={12} className="text-gray-500" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(p.id)}
                          className="p-1.5 hover:bg-red-100 rounded transition-colors"
                          title={t('projects.delete')}
                        >
                          <Trash2 size={12} className="text-red-500" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Backup & restore — single-file portable JSON of everything.
              Critical for the IndexedDB-only model: if a teacher clears
              their browser, the backup is the only way back. */}
          <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-600">
                {t('projects.backup_section_title')}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 leading-snug">
              {t('projects.backup_hint')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleBackup}
                disabled={projects.length === 0 && students.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <DownloadCloud size={13} aria-hidden="true" />
                {t('projects.backup_button')}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <UploadCloud size={13} aria-hidden="true" />
                {t('projects.restore_button')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleRestoreFile(f);
                  // Reset so picking the same file twice still fires.
                  e.target.value = '';
                }}
              />
            </div>
            {restoreError && (
              <p
                role="alert"
                className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded p-2 flex items-start gap-1.5"
              >
                <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{restoreError}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Confirm modal — replacing all data is destructive, so make the
          teacher click through one more time. */}
      {pendingRestore && (
        <>
          <button
            type="button"
            aria-label={t('projects.restore_confirm_no')}
            onClick={() => setPendingRestore(null)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
          />
          <div
            ref={restoreDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-confirm-title"
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(420px,92vw)] bg-white rounded-2xl shadow-2xl p-5 space-y-3 focus:outline-none"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-amber-600" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h3 id="restore-confirm-title" className="font-bold text-gray-900">
                  {t('projects.restore_confirm_title')}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t('projects.restore_confirm_body', {
                    date: pendingRestore.exportedAt
                      ? new Date(pendingRestore.exportedAt).toLocaleString()
                      : '—',
                    students: pendingRestore.data.students.length,
                    projects: pendingRestore.data.projects.length,
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingRestore(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t('projects.restore_confirm_no')}
              </button>
              <button
                type="button"
                onClick={confirmRestore}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                {t('projects.restore_confirm_yes')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
