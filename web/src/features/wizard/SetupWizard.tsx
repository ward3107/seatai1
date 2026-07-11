import { useEffect, useRef } from 'react';
import { Check, ChevronLeft, ChevronRight, Sparkles, Users, LayoutGrid, ListChecks, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { slotCount } from '../../core/layouts';
import LayoutPanel from '../layout/LayoutPanel';
import ConstraintsPanel from '../constraints/ConstraintsPanel';
import WizardStudents from './WizardStudents';
import WizardGenerate from './WizardGenerate';
import type { OptimizerProgress } from '../../hooks/useOptimizer';

interface Props {
  wasmReady: boolean;
  isOptimizing: boolean;
  optimize: () => void;
  progress: OptimizerProgress | null;
  cancel: () => void;
}

const STEP_ICONS = [Users, LayoutGrid, ListChecks, Sparkles];

/**
 * Guided setup flow shown for a new/empty class (or on demand). Walks the
 * teacher through the four stages — add students → set up the room → seating
 * rules → generate — one focused panel at a time, then hands off to the
 * normal workspace once seating is generated.
 */
export default function SetupWizard({ wasmReady, isOptimizing, optimize, progress, cancel }: Props) {
  const { t } = useLanguage();
  const step = useStore((s) => s.wizardStep);
  const setStep = useStore((s) => s.setWizardStep);
  const closeWizard = useStore((s) => s.closeWizard);
  const students = useStore((s) => s.students);
  const layoutDef = useStore((s) => s.layoutDef);

  const seats = slotCount(layoutDef);
  const enoughStudents = students.length >= 2;
  const enoughSeats = students.length <= seats;

  // Move focus to the step panel when the step changes so keyboard and
  // screen-reader users are taken to (and hear) the new step, instead of
  // staying on the Next/Back button.
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.focus();
  }, [step]);

  const stepLabels = [
    t('wizard.step_students'),
    t('wizard.step_classroom'),
    t('wizard.step_rules'),
    t('wizard.step_generate'),
  ];

  // Whether the Next button is enabled for the current step.
  const canAdvance =
    step === 0 ? enoughStudents : step === 1 ? enoughSeats : true;

  const goNext = () => {
    if (step < 3 && canAdvance) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Stepper */}
      <nav aria-label={t('wizard.title')} className="mb-6">
        <ol className="flex items-center">
          {stepLabels.map((label, i) => {
            const Icon = STEP_ICONS[i];
            const done = i < step;
            const current = i === step;
            // Allow jumping back to any completed step, or forward only when
            // the current step's requirements are met.
            const reachable = i <= step || (i === step + 1 && canAdvance);
            return (
              <li key={i} className={clsx('flex items-center', i < 3 && 'flex-1')}>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && setStep(i)}
                  aria-current={current ? 'step' : undefined}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg px-2 py-1 transition-colors',
                    reachable ? 'cursor-pointer' : 'cursor-not-allowed',
                    current && 'text-primary-600 dark:text-primary-300',
                    !current && done && 'text-gray-700 dark:text-gray-300',
                    !current && !done && 'text-gray-400 dark:text-gray-500',
                  )}
                >
                  <span
                    className={clsx(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold',
                      current && 'border-primary-500 bg-primary-500 text-white',
                      done && 'border-primary-500 bg-primary-500 text-white',
                      !current && !done && 'border-gray-300 dark:border-gray-600',
                    )}
                  >
                    {done ? <Check size={16} /> : <Icon size={16} />}
                  </span>
                  <span className="hidden text-sm font-medium sm:inline">{label}</span>
                </button>
                {i < 3 && (
                  <span
                    className={clsx(
                      'mx-1 h-0.5 flex-1 rounded',
                      i < step ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700',
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step body */}
      <div
        ref={bodyRef}
        tabIndex={-1}
        role="group"
        aria-label={stepLabels[step]}
        className="rounded-2xl bg-white/90 dark:bg-gray-800/90 p-4 shadow-sm sm:p-6 focus:outline-none"
      >
        {step === 0 && <WizardStudents />}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('wizard.classroom_title')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('wizard.classroom_desc')}</p>
            </div>
            <LayoutPanel defaultOpen />
            {!enoughSeats && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {t('wizard.not_enough_seats', { students: students.length, seats })}
              </p>
            )}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('wizard.rules_title')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('wizard.rules_desc')}</p>
            </div>
            <ConstraintsPanel defaultOpen />
          </div>
        )}
        {step === 3 && (
          <WizardGenerate
            wasmReady={wasmReady}
            isOptimizing={isOptimizing}
            optimize={optimize}
            progress={progress}
            cancel={cancel}
          />
        )}
      </div>

      {/* Footer nav */}
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={step === 0 ? closeWizard : goBack}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft size={16} className="rtl:rotate-180" />
          {step === 0 ? t('wizard.exit') : t('wizard.back')}
        </button>

        {step < 3 && (
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {t('wizard.skip')}
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 px-5 py-2 text-sm font-semibold text-white shadow hover:shadow-lg transition-shadow disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {step === 0 && !enoughStudents ? t('wizard.need_two_students') : t('wizard.next')}
              <ChevronRight size={16} className="rtl:rotate-180" />
            </button>
          </div>
        )}
      </div>

      {/* Progress spinner mirror while optimizing (the Generate step drives it) */}
      {isOptimizing && step === 3 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <RefreshCw size={14} className="animate-spin" />
          {t('app.optimizing')}
        </div>
      )}
    </div>
  );
}
