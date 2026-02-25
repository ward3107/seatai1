import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../core/store';
import { useOptimizer } from '../hooks/useOptimizer';
import { sampleStudents } from '../utils/sampleData';
import ClassroomGrid from '../features/classroom/ClassroomGrid';
import StudentList from '../features/students/StudentList';
import StudentForm from '../features/students/StudentForm';
import MetricsPanel from '../features/optimization/MetricsPanel';
import SettingsPanel from '../features/settings/SettingsPanel';
import { Menu, X, Play, RefreshCw, Download, Users, Settings } from 'lucide-react';

function App() {
  const {
    students,
    sidebarOpen,
    setSidebarOpen,
    result,
    setStudents,
  } = useStore();

  const { wasmReady, isOptimizing, error, initWasm, optimize } = useOptimizer();

  // Initialize WASM on mount
  useEffect(() => {
    initWasm();
  }, [initWasm]);

  // Load sample data if no students
  useEffect(() => {
    if (students.length === 0) {
      setStudents(sampleStudents);
    }
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 400 : 0 }}
        className="bg-white/95 backdrop-blur-sm shadow-xl overflow-hidden flex flex-col"
      >
        <div className="w-[400px] h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-800">SeatAI</h1>
                <p className="text-xs text-gray-500">Classroom Optimizer</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Students List */}
            <StudentList />

            {/* Student Form */}
            <StudentForm />

            {/* Settings */}
            <SettingsPanel />
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            <button
              onClick={optimize}
              disabled={!wasmReady || isOptimizing || students.length < 2}
              className="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
            >
              {isOptimizing ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Play size={20} />
                  Optimize Seating
                </>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {!wasmReady && !error && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 text-sm flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                Loading optimizer...
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-14 bg-white/90 backdrop-blur-sm shadow-sm flex items-center px-4 gap-4">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={20} className="text-gray-600" />
            </button>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <Users size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-600">
                {students.length} students
              </span>
            </div>

            {result && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-lg">
                <span className="text-sm font-medium text-green-700">
                  Score: {(result.fitness_score * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* Metrics */}
          {result && <MetricsPanel />}

          {/* Classroom Grid */}
          <div className="mt-6">
            <ClassroomGrid />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
