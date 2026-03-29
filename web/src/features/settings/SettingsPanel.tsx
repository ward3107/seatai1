import { useState } from 'react';
import { useStore } from '../../core/store';
import { Settings, ChevronDown, ChevronUp, RotateCcw, Plus, X, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';
import { sampleStudents } from '../../utils/sampleData';
import type { SeatingConstraints } from '../../types';

// ─── Pair picker sub-component ────────────────────────────────────────────────
function PairPicker({
  students,
  existingPairs,
  onAdd,
  onRemove,
  label,
  color,
}: {
  students: { id: string; name: string }[];
  existingPairs: [string, string][];
  onAdd: (a: string, b: string) => void;
  onRemove: (a: string, b: string) => void;
  label: string;
  color: 'red' | 'green';
}) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');

  const handleAdd = () => {
    if (!a || !b || a === b) return;
    // Prevent duplicates (both orderings)
    const dup = existingPairs.some(
      ([x, y]) => (x === a && y === b) || (x === b && y === a)
    );
    if (!dup) onAdd(a, b);
    setA('');
    setB('');
  };

  const getName = (id: string) =>
    students.find(s => s.id === id)?.name.split(' ')[0] ?? id;

  const ring = color === 'red' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';
  const badge = color === 'red'
    ? 'bg-red-100 text-red-800 border-red-300'
    : 'bg-green-100 text-green-800 border-green-300';

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-600">{label}</p>

      {/* Existing pairs */}
      <div className="flex flex-wrap gap-1">
        {existingPairs.map(([x, y]) => (
          <span
            key={`${x}-${y}`}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${badge}`}
          >
            {getName(x)} — {getName(y)}
            <button
              type="button"
              onClick={() => onRemove(x, y)}
              className="ml-0.5 hover:opacity-70"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        {existingPairs.length === 0 && (
          <span className="text-xs text-gray-400 italic">None set</span>
        )}
      </div>

      {/* Add pair */}
      <div className={`flex items-center gap-1.5 p-2 rounded-lg border ${ring}`}>
        <select
          value={a}
          onChange={e => setA(e.target.value)}
          className="flex-1 text-xs px-1.5 py-1 border border-gray-300 rounded bg-white"
        >
          <option value="">Student A</option>
          {students.filter(s => s.id !== b).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">↔</span>
        <select
          value={b}
          onChange={e => setB(e.target.value)}
          className="flex-1 text-xs px-1.5 py-1 border border-gray-300 rounded bg-white"
        >
          <option value="">Student B</option>
          {students.filter(s => s.id !== a).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!a || !b || a === b}
          className="p-1 bg-gray-700 text-white rounded disabled:opacity-30 hover:bg-gray-900 transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Row-assignment picker ─────────────────────────────────────────────────────
function RowAssignPicker({
  students,
  selectedIds,
  onToggle,
  label,
  icon,
  color,
}: {
  students: { id: string; name: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  label: string;
  icon: React.ReactNode;
  color: 'indigo' | 'orange';
}) {
  const active = color === 'indigo'
    ? 'bg-indigo-100 border-indigo-400 text-indigo-800'
    : 'bg-orange-100 border-orange-400 text-orange-800';

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-600 flex items-center gap-1">{icon}{label}</p>
      <div className="flex flex-wrap gap-1">
        {students.map(s => {
          const on = selectedIds.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s.id)}
              className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                on ? active : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {s.name.split(' ')[0]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main SettingsPanel ────────────────────────────────────────────────────────
export default function SettingsPanel() {
  const {
    rows, cols, setRows, setCols,
    weights, setWeights,
    config, setConfig,
    constraints, setConstraints,
    students,
    setStudents, setResult,
  } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const resetToDemo = () => {
    setStudents(sampleStudents);
    setResult(null);
    setRows(5);
    setCols(6);
  };

  // ── Constraint helpers ────────────────────────────────
  const addPair = (field: 'separate_pairs' | 'keep_together_pairs') =>
    (a: string, b: string) =>
      setConstraints({
        ...constraints,
        [field]: [...constraints[field], [a, b] as [string, string]],
      });

  const removePair = (field: 'separate_pairs' | 'keep_together_pairs') =>
    (a: string, b: string) =>
      setConstraints({
        ...constraints,
        [field]: (constraints[field] as [string, string][]).filter(
          ([x, y]) => !(x === a && y === b) && !(x === b && y === a)
        ),
      });

  const toggleRowId = (field: 'front_row_ids' | 'back_row_ids') => (id: string) => {
    const list = constraints[field];
    setConstraints({
      ...constraints,
      [field]: list.includes(id) ? list.filter(x => x !== id) : [...list, id],
    } as SeatingConstraints);
  };

  const totalRules =
    constraints.separate_pairs.length +
    constraints.keep_together_pairs.length +
    constraints.front_row_ids.length +
    constraints.back_row_ids.length;

  return (
    <div className="bg-gray-50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-gray-500" />
          <span className="font-medium text-gray-700">Settings</span>
        </div>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isOpen && (
        <div className="p-4 pt-0 space-y-4">
          {/* Reset */}
          <button
            onClick={resetToDemo}
            className="w-full py-2 px-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-md transition-shadow"
          >
            <RotateCcw size={16} />
            Load Demo Data (30 students)
          </button>

          {/* Layout */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Rows</label>
              <input
                type="number" min="1" max="20" value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Columns</label>
              <input
                type="number" min="1" max="20" value={cols}
                onChange={(e) => setCols(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Objective Weights */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Objective Weights</label>
            <div className="space-y-2">
              {[
                { key: 'academic_balance', label: 'Academic' },
                { key: 'behavioral_balance', label: 'Behavioral' },
                { key: 'diversity', label: 'Diversity' },
                { key: 'special_needs', label: 'Special Needs' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-24">{label}</span>
                  <input
                    type="range" min="0" max="100"
                    value={(weights[key as keyof typeof weights] || 0) * 100}
                    onChange={(e) => setWeights({ ...weights, [key]: Number(e.target.value) / 100 })}
                    className="flex-1 h-2"
                  />
                  <span className="text-xs text-gray-600 w-10 text-right">
                    {Math.round((weights[key as keyof typeof weights] || 0) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Algorithm Config */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Algorithm</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Population</label>
                <input
                  type="number" min="10" max="500" value={config.populationSize}
                  onChange={(e) => setConfig({ ...config, populationSize: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Generations</label>
                <input
                  type="number" min="10" max="500" value={config.maxGenerations}
                  onChange={(e) => setConfig({ ...config, maxGenerations: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* ── Seating Rules ── */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowRules(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <span>
                Seating Rules
                {totalRules > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                    {totalRules}
                  </span>
                )}
              </span>
              {showRules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showRules && (
              <div className="p-3 space-y-4">
                {students.length < 2 ? (
                  <p className="text-xs text-gray-400 italic">
                    Add at least 2 students to define seating rules.
                  </p>
                ) : (
                  <>
                    <PairPicker
                      students={students}
                      existingPairs={constraints.separate_pairs as [string, string][]}
                      onAdd={addPair('separate_pairs')}
                      onRemove={removePair('separate_pairs')}
                      label="Must be separated (placed far apart)"
                      color="red"
                    />

                    <PairPicker
                      students={students}
                      existingPairs={constraints.keep_together_pairs as [string, string][]}
                      onAdd={addPair('keep_together_pairs')}
                      onRemove={removePair('keep_together_pairs')}
                      label="Should sit near each other"
                      color="green"
                    />

                    <RowAssignPicker
                      students={students}
                      selectedIds={constraints.front_row_ids}
                      onToggle={toggleRowId('front_row_ids')}
                      label="Force to front row"
                      icon={<ArrowUpToLine size={12} className="text-indigo-500" />}
                      color="indigo"
                    />

                    <RowAssignPicker
                      students={students}
                      selectedIds={constraints.back_row_ids}
                      onToggle={toggleRowId('back_row_ids')}
                      label="Prefer back row"
                      icon={<ArrowDownToLine size={12} className="text-orange-500" />}
                      color="orange"
                    />

                    {totalRules > 0 && (
                      <button
                        type="button"
                        onClick={() => setConstraints({
                          separate_pairs: [],
                          keep_together_pairs: [],
                          front_row_ids: [],
                          back_row_ids: [],
                        })}
                        className="text-xs text-red-500 hover:text-red-700 underline"
                      >
                        Clear all rules
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
