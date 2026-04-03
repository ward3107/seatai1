import { useState } from 'react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { FolderOpen, Save, Trash2, Check, X, Plus, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import type { ClassProject } from '../../types';

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

  const currentProject = projects.find(p => p.id === currentProjectId);

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
                          {p.result && ` · ${t('app.score')}: ${(p.result.fitness_score * 100).toFixed(0)}%`}
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
        </div>
      )}
    </div>
  );
}
