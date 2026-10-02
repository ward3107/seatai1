import { motion, useReducedMotion } from 'framer-motion';
import { UserPlus, Sparkles, FileText, Users, LayoutGrid, ListChecks } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { SAMPLE_CLASSES } from '../../utils/sampleData';

export default function OnboardingView() {
  const setStudents = useStore((s) => s.setStudents);
  const setLayoutDef = useStore((s) => s.setLayoutDef);
  const startWizard = useStore((s) => s.startWizard);
  const setHomeView = useStore((s) => s.setHomeView);
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();

  function loadSampleClass(id: typeof SAMPLE_CLASSES[number]['id']) {
    const sample = SAMPLE_CLASSES.find((c) => c.id === id);
    if (!sample) return;
    if (useStore.getState().students.length > 0 && !window.confirm(t('wizard.confirm_sample_replace'))) return;
    // Make a deep copy so the user can edit students without mutating the
    // original sample data (otherwise switching back returns edited names).
    setStudents(JSON.parse(JSON.stringify(sample.students)));
    setLayoutDef({ type: 'rows', rows: sample.rows, cols: sample.cols });
    // A sample is a complete class + layout — drop straight into the
    // workspace rather than the setup wizard.
    setHomeView(false);
  }

  // Distinct task colors accompany labels rather than replacing them.
  const steps = [
    {
      icon: Users,
      color: 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200',
      title: t('teacherFlow.students'),
      desc: t('teacherFlow.studentsHint'),
    },
    {
      icon: LayoutGrid,
      color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200',
      title: t('teacherFlow.room'),
      desc: t('teacherFlow.roomHint'),
    },
    {
      icon: ListChecks,
      color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200',
      title: t('teacherFlow.rules'),
      desc: t('teacherFlow.rulesHint'),
    },
    {
      icon: FileText,
      color: 'bg-amber-100 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200',
      title: t('teacherFlow.review'),
      desc: t('teacherFlow.reviewHint'),
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center justify-center min-h-[60vh] px-2 py-8 text-center">
      <div className="grid w-full items-center gap-10 lg:grid-cols-2 mb-10">
      {/* Hero */}
      <motion.div
        className="text-start"
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <img src="/seatai-logo.svg" alt="" aria-hidden="true" className="w-20 h-20 rounded-2xl mb-5 shadow-lg" width={80} height={80} />

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-gray-800 dark:text-gray-100 mb-3">
          {t('homeRefresh.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-base max-w-lg leading-relaxed">
          {t('homeRefresh.intro')}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => startWizard()} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary-600 px-7 py-3 font-semibold text-white hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-600"><UserPlus size={20} aria-hidden="true" />{t('onboarding.get_started')}</button>
          <a href="#sample-classes" className="inline-flex min-h-12 items-center rounded-xl px-4 text-sm font-medium text-primary-700 underline underline-offset-4 dark:text-primary-300">{t('teacherFlow.tryDemo')}</a>
        </div>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{t('teacherDesign.reassurance')}</p>
      </motion.div>

      <motion.div className="relative rounded-[2rem] border border-teal-100 dark:border-teal-800 bg-gradient-to-br from-teal-50 via-sky-50 to-violet-50 dark:from-teal-950 dark:via-gray-900 dark:to-violet-950 p-6 sm:p-10 overflow-hidden"
        initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
        <div className="flex items-center justify-between mb-5 text-sm font-semibold text-teal-900 dark:text-teal-100"><span>{t('homeRefresh.preview')}</span><Sparkles size={19} /></div>
        <div className="rounded-2xl bg-white/90 dark:bg-gray-800 p-5 shadow-xl border border-white dark:border-gray-700">
          <div className="mx-auto mb-5 w-24 rounded-lg bg-amber-100 py-2 text-xs text-amber-900">{t('classroom.teacher_desk')}</div>
          <div className="grid grid-cols-4 gap-3" aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => <motion.div key={i} className="aspect-square rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center"
              animate={reducedMotion ? {} : { y: [0, -5, 0] }} transition={{ duration: 2, delay: i * 0.08, ease: 'easeInOut' }}>
              <span className={`h-7 w-7 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-white ${['bg-teal-500', 'bg-violet-400', 'bg-sky-400', 'bg-rose-400'][i % 4]}`}><Users size={15} /></span>
            </motion.div>)}
          </div>
        </div>
        <motion.div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white dark:bg-gray-800 px-4 py-2 text-xs text-teal-800 dark:text-teal-200 shadow-sm"
          initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}><Sparkles size={14} />{t('homeRefresh.control')}</motion.div>
      </motion.div>
      </div>

      {/* Steps */}
      <h2 className="mb-4 w-full text-start text-xl font-bold text-gray-800 dark:text-gray-100">{t('teacherFlow.heading')}</h2>
      <ol
        className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 mb-7 w-full"
      >
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <li
              key={i}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 text-start"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${step.color}`}><Icon size={20} aria-hidden="true" /></span>
                <span className="text-sm font-semibold text-gray-400" aria-hidden="true">{i + 1}</span>
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
                {step.title}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
            </li>
          );
        })}
      </ol>

      {/* Primary CTA */}
      <motion.div
        className="flex flex-col items-center gap-4"
      >

        {/* Or pick a pre-built demo class */}
        <div id="sample-classes" className="flex scroll-mt-6 flex-col items-center gap-3 rounded-2xl bg-sky-50 p-5 dark:bg-slate-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">
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
