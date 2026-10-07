import { motion, useReducedMotion } from 'framer-motion';
import { UserPlus, Sparkles, Users, UserRound, ChevronRight } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { SAMPLE_CLASSES } from '../../utils/sampleData';
import TeacherQuickGuide from '../../components/TeacherQuickGuide';

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

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center justify-center px-1 py-3 sm:px-3 sm:py-8 text-center">
      <div className="grid w-full items-center gap-6 lg:gap-14 md:grid-cols-2 mb-7 sm:mb-10">
      {/* Hero */}
      <motion.div
        className="text-start"
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <img src="/seatai-logo.svg" alt="" aria-hidden="true" className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl mb-5 shadow-sm" width={80} height={80} />

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-gray-800 dark:text-gray-100 mb-3">
          {t('homeRefresh.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-base max-w-lg leading-relaxed">
          {t('homeRefresh.intro')}
        </p>
        <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <button type="button" onClick={() => startWizard()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl shadow-sm transition-colors bg-primary-600 px-7 py-3 font-semibold text-white hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-600"><UserPlus size={20} aria-hidden="true" />{t('onboarding.get_started')}</button>
          <a href="#sample-classes" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-primary-700 dark:border-gray-700 dark:bg-gray-800 dark:text-primary-300">{t('teacherFlow.tryDemo')}</a>
        </div>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{t('teacherDesign.reassurance')}</p>
      </motion.div>

      <motion.div className="hidden md:block relative w-full max-w-lg mx-auto rounded-[2rem] border border-teal-100 dark:border-teal-800 bg-teal-50/70 dark:bg-gray-900 p-5 sm:p-7 overflow-hidden"
        initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
        <div className="flex items-center justify-between mb-5 text-sm font-semibold text-teal-900 dark:text-teal-100"><span>{t('homeRefresh.preview')}</span><Sparkles size={19} /></div>
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 sm:p-5 shadow-[0_12px_32px_-12px_rgba(15,118,110,0.25)] border border-teal-100 dark:border-gray-700">
          <div className="mx-auto mb-5 w-24 rounded-lg bg-amber-100 py-2 text-xs text-amber-900">{t('classroom.teacher_desk')}</div>
          <div className="grid grid-cols-4 gap-x-3 gap-y-2" aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => <motion.div key={i} className="h-14 sm:h-16 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm"
              >
              <span className={`h-7 w-7 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-white ${['bg-teal-500', 'bg-violet-400', 'bg-sky-400', 'bg-rose-400'][i % 4]}`}><UserRound size={16} /></span>
            </motion.div>)}
          </div>
        </div>
        <motion.div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white dark:bg-gray-800 px-4 py-2 text-xs text-teal-800 dark:text-teal-200 shadow-sm"
          initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}><Sparkles size={14} />{t('homeRefresh.control')}</motion.div>
      </motion.div>
      </div>

      <TeacherQuickGuide />

      {/* Primary CTA */}
      <motion.div
        className="w-full"
      >

        {/* Or pick a pre-built demo class */}
        <section id="sample-classes" className="sample-classes mt-6 w-full scroll-mt-4 text-start" aria-labelledby="sample-classes-title">
          <h2 id="sample-classes-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('onboarding.or_try_a_sample')}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t('quickGuide.sample_hint')}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {SAMPLE_CLASSES.map((sample) => (
              <button type="button"
                key={sample.id}
                onClick={() => loadSampleClass(sample.id)}
                className="sample-class-button flex min-h-16 min-w-0 items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-start text-gray-800 hover:border-primary-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200"><Users size={19} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t(`onboarding.sample_${sample.id}`)}</span><span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{sample.students.length} {t('app.students')}</span></span>
                <ChevronRight size={18} className="shrink-0 text-gray-400 rtl:rotate-180" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      </motion.div>

      <p className="mt-6 text-xs text-gray-400 dark:text-gray-400">
        {t('onboarding.privacy')}
      </p>
    </div>
  );
}
