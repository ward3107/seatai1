import { useState, useEffect } from 'react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { generateId, createEmptyStudent } from '../../utils/sampleData';
import type { Student, Gender, AcademicLevel, BehaviorLevel, SpecialNeed } from '../../types';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

const SPECIAL_NEED_TYPES = [
  'ADHD', 'Dyslexia', 'Visual Impairment', 'Hearing Impairment',
  'Wheelchair', 'ESL', 'Autism', 'Dyscalculia', 'Other',
];

const LANGUAGES = [
  'Hebrew', 'Arabic', 'Russian', 'English', 'Amharic',
  'French', 'Spanish', 'Mandarin', 'Hindi', 'Other',
];

export default function StudentForm() {
  const { students, addStudent, updateStudent, selectedStudentId, setSelectedStudentId } = useStore();
  const { t } = useLanguage();

  const editingStudent = selectedStudentId
    ? students.find(s => s.id === selectedStudentId)
    : null;

  const [form, setForm] = useState<Student>(createEmptyStudent());
  const [isAdding, setIsAdding] = useState(false);
  const [showRelations, setShowRelations] = useState(false);
  const [showSpecialNeeds, setShowSpecialNeeds] = useState(false);

  useEffect(() => {
    if (editingStudent) {
      setForm(editingStudent);
      setIsAdding(true);
      setShowRelations(editingStudent.friends_ids.length > 0 || editingStudent.incompatible_ids.length > 0);
      setShowSpecialNeeds(editingStudent.special_needs.length > 0 || editingStudent.has_mobility_issues);
    }
  }, [editingStudent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingStudent) {
      updateStudent(editingStudent.id, form);
      setSelectedStudentId(null);
    } else {
      addStudent({ ...form, id: generateId() });
    }

    setForm(createEmptyStudent());
    setIsAdding(false);
    setShowRelations(false);
    setShowSpecialNeeds(false);
  };

  const handleCancel = () => {
    setForm(createEmptyStudent());
    setIsAdding(false);
    setShowRelations(false);
    setShowSpecialNeeds(false);
    setSelectedStudentId(null);
  };

  const toggleId = (field: 'friends_ids' | 'incompatible_ids', id: string) => {
    const list = form[field];
    setForm({
      ...form,
      [field]: list.includes(id) ? list.filter(x => x !== id) : [...list, id],
    });
  };

  const addSpecialNeed = (type: string) => {
    if (form.special_needs.some(n => n.type === type)) return;
    const need: SpecialNeed = {
      type,
      description: '',
      requires_front_seat: type === 'Visual Impairment' || type === 'Hearing Impairment',
      requires_support_buddy: type === 'ADHD' || type === 'ESL',
    };
    setForm({ ...form, special_needs: [...form.special_needs, need] });
  };

  const removeSpecialNeed = (type: string) => {
    setForm({ ...form, special_needs: form.special_needs.filter(n => n.type !== type) });
  };

  const updateNeed = (index: number, patch: Partial<SpecialNeed>) => {
    const updated = form.special_needs.map((n, i) => i === index ? { ...n, ...patch } : n);
    setForm({ ...form, special_needs: updated });
  };

  // Students available to pick as friends / incompatible (exclude self)
  const otherStudents = students.filter(s => s.id !== (editingStudent?.id ?? form.id));

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-400 hover:text-primary-500 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        {t('students.add_button')}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">
          {editingStudent ? t('students.edit') : t('students.add')}
        </h3>
        <button type="button" onClick={handleCancel} className="p-1 hover:bg-gray-100 rounded">
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('students.name')}</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder={t('students.name_placeholder')}
          required
        />
      </div>

      {/* Gender + Language */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('students.gender')}</label>
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('students.language')}</label>
          <select
            value={form.primary_language ?? ''}
            onChange={(e) => setForm({ ...form, primary_language: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">— select —</option>
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Academic */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('students.academic_level')}</label>
          <select
            value={form.academic_level}
            onChange={(e) => setForm({ ...form, academic_level: e.target.value as AcademicLevel })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="advanced">Advanced</option>
            <option value="proficient">Proficient</option>
            <option value="basic">Basic</option>
            <option value="below_basic">Below Basic</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('students.score')}</label>
          <input
            type="number" min="0" max="100"
            value={form.academic_score}
            onChange={(e) => setForm({ ...form, academic_score: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Behavior */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('students.behavior_level')}</label>
          <select
            value={form.behavior_level}
            onChange={(e) => setForm({ ...form, behavior_level: e.target.value as BehaviorLevel })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="average">Average</option>
            <option value="challenging">Challenging</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('students.score')}</label>
          <input
            type="number" min="0" max="100"
            value={form.behavior_score}
            onChange={(e) => setForm({ ...form, behavior_score: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* ── Relationships section (collapsible) ── */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRelations(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <span>{t('students.relationships')} {(form.friends_ids.length + form.incompatible_ids.length) > 0 && `(${form.friends_ids.length + form.incompatible_ids.length})`}</span>
          {showRelations ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showRelations && (
          <div className="p-3 space-y-3">
            {otherStudents.length === 0 ? (
              <p className="text-xs text-gray-400 italic">{t('students.need_more_students')}</p>
            ) : (
              <>
                {/* Friends */}
                <div>
                  <p className="text-xs font-medium text-green-700 mb-1">{t('students.friends_label')}</p>
                  <div className="flex flex-wrap gap-1">
                    {otherStudents.map(s => {
                      const active = form.friends_ids.includes(s.id);
                      const conflict = form.incompatible_ids.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={conflict}
                          onClick={() => toggleId('friends_ids', s.id)}
                          className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                            active
                              ? 'bg-green-100 border-green-400 text-green-800'
                              : conflict
                              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                              : 'border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700'
                          }`}
                        >
                          {s.name.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Incompatible */}
                <div>
                  <p className="text-xs font-medium text-red-700 mb-1">{t('students.incompatible_label')}</p>
                  <div className="flex flex-wrap gap-1">
                    {otherStudents.map(s => {
                      const active = form.incompatible_ids.includes(s.id);
                      const friend = form.friends_ids.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={friend}
                          onClick={() => toggleId('incompatible_ids', s.id)}
                          className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                            active
                              ? 'bg-red-100 border-red-400 text-red-800'
                              : friend
                              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                              : 'border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-700'
                          }`}
                        >
                          {s.name.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Special needs section (collapsible) ── */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSpecialNeeds(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <span>{t('students.accessibility_title')} {form.special_needs.length > 0 && `(${form.special_needs.length})`}</span>
          {showSpecialNeeds ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showSpecialNeeds && (
          <div className="p-3 space-y-3">
            {/* Basic flags */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.requires_front_row}
                  onChange={(e) => setForm({ ...form, requires_front_row: e.target.checked })}
                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{t('students.requires_front_row')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.has_mobility_issues}
                  onChange={(e) => setForm({ ...form, has_mobility_issues: e.target.checked })}
                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{t('students.mobility_issues')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.requires_quiet_area}
                  onChange={(e) => setForm({ ...form, requires_quiet_area: e.target.checked })}
                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{t('students.requires_quiet_area')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_bilingual}
                  onChange={(e) => setForm({ ...form, is_bilingual: e.target.checked })}
                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{t('students.bilingual')}</span>
              </label>
            </div>

            {/* Add a special need type */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">{t('students.add_specific_need')}</p>
              <div className="flex flex-wrap gap-1">
                {SPECIAL_NEED_TYPES.map(type => {
                  const active = form.special_needs.some(n => n.type === type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => active ? removeSpecialNeed(type) : addSpecialNeed(type)}
                      className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                        active
                          ? 'bg-purple-100 border-purple-400 text-purple-800'
                          : 'border-gray-300 text-gray-600 hover:border-purple-400 hover:text-purple-700'
                      }`}
                    >
                      {active ? `✓ ${type}` : `+ ${type}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Configured special needs */}
            {form.special_needs.map((need, i) => (
              <div key={need.type} className="bg-purple-50 rounded-lg p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-purple-800">{need.type}</span>
                  <button type="button" onClick={() => removeSpecialNeed(need.type)} className="p-0.5 hover:bg-purple-100 rounded">
                    <X size={12} className="text-purple-600" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={need.description ?? ''}
                  onChange={(e) => updateNeed(i, { description: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-purple-200 rounded focus:ring-1 focus:ring-purple-400 bg-white"
                />
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 text-xs text-purple-700">
                    <input
                      type="checkbox"
                      checked={need.requires_front_seat}
                      onChange={(e) => updateNeed(i, { requires_front_seat: e.target.checked })}
                      className="rounded border-purple-300 text-purple-500"
                    />
                    {t('students.front_seat')}
                  </label>
                  <label className="flex items-center gap-1 text-xs text-purple-700">
                    <input
                      type="checkbox"
                      checked={need.requires_support_buddy}
                      onChange={(e) => updateNeed(i, { requires_support_buddy: e.target.checked })}
                      className="rounded border-purple-300 text-purple-500"
                    />
                    {t('students.support_buddy')}
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
      >
        {editingStudent ? t('students.update') : t('students.add')}
      </button>
    </form>
  );
}
