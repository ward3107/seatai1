import { motion } from 'framer-motion';
import { Upload, UserPlus, Sparkles, FileText, Users } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { SAMPLE_CLASSES } from '../../utils/sampleData';

export default function OnboardingView() {
  const setStudents = useStore((s) => s.setStudents);
  const setLayoutDef = useStore((s) => s.setLayoutDef);
  const startWizard = useStore((s) => s.startWizard);
  const setHomeView = useStore((s) => s.setHomeView);
  const { t } = useLanguage();

  function loadSampleClass(id: typeof SAMPLE_CLASSES[number]['id']) {
    const sample = SAMPLE_CLASSES.find((c) => c.id === id);
    if (!sample) return;
    // Make a deep copy so the user can edit students without mutating the
    // original sample data (otherwise switching back returns edited names).
    setStudents(JSON.parse(JSON.stringify(sample.students)));
    setLayoutDef({ type: 'rows', rows: sample.rows, cols: sample.cols });
    // A sample is a complete class + layout — drop straight into the
    // workspace rather than the setup wizard.
    setHomeView(false);
  }

  const steps = [
    {
      icon: Upload,
      color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300',
      title: t('onboarding.import_title'),
      desc: t('onboarding.import_desc'),
    },
    {
      icon: UserPlus,
      color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300',
      title: t('onboarding.manual_title'),
      desc: t('onboarding.manual_desc'),
    },
    {
      icon: Sparkles,
      color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300',
      title: t('onboarding.optimize_title'),
      desc: t('onboarding.optimize_desc'),
    },
    {
      icon: FileText,
      color: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300',
      title: t('onboarding.export_title'),
      desc: t('onboarding.export_desc'),
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <img src="/seatai-logo.svg" alt="" aria-hidden="true" className="w-20 h-20 rounded-2xl mx-auto mb-5 shadow-lg" width={80} height={80} />

        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          {t('onboarding.welcome_title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-base max-w-md mx-auto">
          {t('onboarding.welcome_desc')}
        </p>
      </motion.div>

      {/* Steps */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="grid grid-cols-2 gap-4 mb-10 max-w-xl w-full"
      >
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-left shadow-sm"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${step.color}`}>
                <Icon size={18} />
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
                {step.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
            </div>
          );
        })}
      </motion.div>

      {/* Primary CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        <button
          onClick={() => startWizard()}
          className="px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold shadow hover:shadow-lg transition-shadow flex items-center gap-2"
        >
          <UserPlus size={18} />
          {t('onboarding.get_started')}
        </button>

        {/* Or pick a pre-built demo class */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-400 uppercase tracking-wide">
            {t('onboarding.or_try_a_sample')}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SAMPLE_CLASSES.map((sample) => (
              <button
                key={sample.id}
                onClick={() => loadSampleClass(sample.id)}
                className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 transition-colors flex items-center gap-2"
              >
                <Users size={14} className="text-amber-500 dark:text-amber-400" />
                <span>{t(`onboarding.sample_${sample.id}` as const)}</span>
                <span className="text-xs text-gray-400 dark:text-gray-400">
                  · {sample.students.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <p className="mt-6 text-xs text-gray-400 dark:text-gray-400">
        {t('onboarding.privacy')}
      </p>
    </div>
  );
}
