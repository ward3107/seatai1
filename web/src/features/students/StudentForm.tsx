import { useState, useEffect } from 'react';
import { useStore } from '../../core/store';
import { generateId, createEmptyStudent } from '../../utils/sampleData';
import type { Student, Gender, AcademicLevel, BehaviorLevel } from '../../types';
import { Plus, X } from 'lucide-react';

export default function StudentForm() {
  const { students, addStudent, updateStudent, selectedStudentId, setSelectedStudentId } = useStore();

  const editingStudent = selectedStudentId
    ? students.find(s => s.id === selectedStudentId)
    : null;

  const [form, setForm] = useState<Student>(createEmptyStudent());
  const [isAdding, setIsAdding] = useState(false);

  // Load student when editing
  useEffect(() => {
    if (editingStudent) {
      setForm(editingStudent);
      setIsAdding(true);
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
  };

  const handleCancel = () => {
    setForm(createEmptyStudent());
    setIsAdding(false);
    setSelectedStudentId(null);
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-400 hover:text-primary-500 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        Add Student
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">
          {editingStudent ? 'Edit Student' : 'Add Student'}
        </h3>
        <button
          type="button"
          onClick={handleCancel}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Student name"
          required
        />
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
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

      {/* Academic */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Academic Level</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Score (0-100)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={form.academic_score}
            onChange={(e) => setForm({ ...form, academic_score: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Behavior */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Behavior Level</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Score (0-100)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={form.behavior_score}
            onChange={(e) => setForm({ ...form, behavior_score: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Special Needs */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.requires_front_row}
            onChange={(e) => setForm({ ...form, requires_front_row: e.target.checked })}
            className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Requires front row</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.requires_quiet_area}
            onChange={(e) => setForm({ ...form, requires_quiet_area: e.target.checked })}
            className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Requires quiet area</span>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
      >
        {editingStudent ? 'Update Student' : 'Add Student'}
      </button>
    </form>
  );
}
