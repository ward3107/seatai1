import { useState } from 'react';
import { useStore } from '../../core/store';
import { Settings, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { sampleStudents } from '../../utils/sampleData';

export default function SettingsPanel() {
  const { rows, cols, setRows, setCols, weights, setWeights, config, setConfig, setStudents, setResult } = useStore();
  const [isOpen, setIsOpen] = useState(false);

  const resetToDemo = () => {
    setStudents(sampleStudents);
    setResult(null);
    setRows(5);
    setCols(6);
  };

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
          {/* Reset Button */}
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
                type="number"
                min="1"
                max="20"
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Columns</label>
              <input
                type="number"
                min="1"
                max="20"
                value={cols}
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
                    type="range"
                    min="0"
                    max="100"
                    value={(weights[key as keyof typeof weights] || 0) * 100}
                    onChange={(e) => {
                      const value = Number(e.target.value) / 100;
                      setWeights({ ...weights, [key]: value });
                    }}
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
                  type="number"
                  min="10"
                  max="500"
                  value={config.populationSize}
                  onChange={(e) => setConfig({ ...config, populationSize: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Generations</label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={config.maxGenerations}
                  onChange={(e) => setConfig({ ...config, maxGenerations: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
