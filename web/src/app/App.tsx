import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../core/store';
import { useOptimizer } from '../hooks/useOptimizer';
import { useState } from 'react';
import ClassroomGrid from '../features/classroom/ClassroomGrid';
import StudentList from '../features/students/StudentList';
import StudentForm from '../features/students/StudentForm';
import MetricsPanel from '../features/optimization/MetricsPanel';
import ExplanationPanel from '../features/results/ExplanationPanel';
import SettingsPanel from '../features/settings/SettingsPanel';
import ExportButton from '../features/export/ExportButton';
import CsvImport from '../features/import/CsvImport';
import ProjectManager from '../features/projects/ProjectManager';
import PrintView from '../features/print/PrintView';
import OnboardingView from '../features/onboarding/OnboardingView';
import LanguageSelector from '../components/LanguageSelector';
import ErrorBoundary from '../components/ErrorBoundary';
import { useLanguage } from '../hooks/useLanguage';
import { Menu, X, Play, RefreshCw, Users, Printer } from 'lucide-react';

function App() {
  const {
    students,
    sidebarOpen,
    setSidebarOpen,
    result,
  } = useStore();

  const { wasmReady, isOptimizing, error, initWasm, optimize } = useOptimizer();
  const { t } = useLanguage();
  const [showPrint, setShowPrint] = useState(false);

  // Initialize WASM on mount
  useEffect(() => {
    initWasm();
  }, [initWasm]);

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
                <h1 className="font-bold text-xl text-gray-800">{t('app.title')}</h1>
                <p className="text-xs text-gray-500">{t('app.subtitle')}</p>
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
            <ErrorBoundary name="Projects" inline>
              <ProjectManager />
            </ErrorBoundary>

            <ErrorBoundary name="CSV Import" inline>
              <CsvImport />
            </ErrorBoundary>

            <ErrorBoundary name="Student List" inline>
              <StudentList />
            </ErrorBoundary>

            <ErrorBoundary name="Student Form" inline>
              <StudentForm />
            </ErrorBoundary>

            <ErrorBoundary name="Settings" inline>
              <SettingsPanel />
            </ErrorBoundary>
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
                  {t('app.optimizing')}
                </>
              ) : (
                <>
                  <Play size={20} />
                  {t('app.optimize_seating')}
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
                {t('app.loading_optimizer')}
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
                {students.length} {t('app.students')}
              </span>
            </div>

            {result && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-lg">
                <span className="text-sm font-medium text-green-700">
                  {t('app.score')}: {(result.fitness_score * 100).toFixed(1)}%
                </span>
              </div>
            )}

            {result && (
              <button
                onClick={() => setShowPrint(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                title={t('app.print_title')}
              >
                <Printer size={15} className="text-gray-500" />
                {t('app.print')}
              </button>
            )}
            <LanguageSelector />
            <ExportButton />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {students.length === 0 ? (
            /* ── Onboarding empty state ── */
            <OnboardingView onOpenSidebar={() => setSidebarOpen(true)} />
          ) : (
            <>
              {/* Metrics */}
              {result && (
                <ErrorBoundary name="Metrics Panel" inline>
                  <MetricsPanel />
                </ErrorBoundary>
              )}

              {/* Placement explanations */}
              {result && (
                <ErrorBoundary name="Explanation Panel" inline>
                  <ExplanationPanel />
                </ErrorBoundary>
              )}

              {/* Classroom Grid */}
              <div className="mt-6">
                <ErrorBoundary name="Seating Grid">
                  <ClassroomGrid />
                </ErrorBoundary>
              </div>
            </>
          )}
        </div>
      </main>
      {showPrint && <PrintView onClose={() => setShowPrint(false)} />}
    </div>
  );
}

export default App;
