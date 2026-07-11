import { useState } from 'react';
import { ClipboardList, ChevronDown, ChevronUp, Play, RotateCcw, Smartphone, Printer } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage, LANG_FONTS } from '../../hooks/useLanguage';
import { printHandout } from './printHandout';
import { MAX_SEATMATES } from './surveyMapping';

/**
 * Step-1 entry point for the student questionnaire. Frames the survey as the
 * first thing a teacher does, gates it behind a consent acknowledgement, and
 * tracks how many students have been surveyed. The actual survey runs in
 * QuestionnaireModal (opened via the store's `questionnaireOpen` flag).
 */
export default function QuestionnairePanel() {
  const { t, uiLanguage, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);

  const students = useStore((s) => s.students);
  const { consentAck, surveyedIds, skipPeers, peerSurveyEnabled, simpleMode } = useStore((s) => s.questionnaire);
  const setConsent = useStore((s) => s.setQuestionnaireConsent);
  const setSkipPeers = useStore((s) => s.setQuestionnaireSkipPeers);
  const setPeerEnabled = useStore((s) => s.setQuestionnairePeerEnabled);
  const setSimpleMode = useStore((s) => s.setQuestionnaireSimpleMode);
  const resetQuestionnaire = useStore((s) => s.resetQuestionnaire);
  const setQuestionnaireOpen = useStore((s) => s.setQuestionnaireOpen);

  const peerEnabled = peerSurveyEnabled ?? true;

  const total = students.length;
  const done = surveyedIds.filter((id) => students.some((s) => s.id === id)).length;
  const complete = total > 0 && done >= total;

  return (
    <div className="bg-indigo-50/60 dark:bg-indigo-900/30 rounded-xl overflow-hidden border border-indigo-100 dark:border-indigo-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-4 flex items-center justify-between hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-indigo-500 dark:text-indigo-400" />
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('questionnaire.title')}</span>
          <span className="text-[10px] uppercase tracking-wide bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-semibold">
            {t('questionnaire.step_badge')}
          </span>
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="p-4 pt-0 space-y-3">
          <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">{t('questionnaire.intro')}</p>

          {total === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700">
              {t('questionnaire.add_students_first')}
            </p>
          ) : (
            <>
              {/* Consent gate */}
              <label className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer bg-white dark:bg-gray-800 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700">
                <input
                  type="checkbox"
                  checked={consentAck}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-indigo-500 focus:ring-indigo-500"
                />
                <span>
                  <span className="font-medium">{t('questionnaire.consent_label')}</span>
                  <span className="block text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{t('questionnaire.consent_hint')}</span>
                </span>
              </label>

              {/* Options */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={peerEnabled}
                    onChange={(e) => setPeerEnabled(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-500 focus:ring-indigo-500"
                  />
                  {t('questionnaire.peer_enabled')}
                </label>
                {peerEnabled && (
                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer pl-5">
                    <input
                      type="checkbox"
                      checked={skipPeers}
                      onChange={(e) => setSkipPeers(e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-500 focus:ring-indigo-500"
                    />
                    {t('questionnaire.skip_peers')}
                  </label>
                )}
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!simpleMode}
                    onChange={(e) => setSimpleMode(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-500 focus:ring-indigo-500"
                  />
                  {t('questionnaire.simple_mode')}
                </label>
              </div>

              {/* Progress */}
              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>{t('questionnaire.progress', { done, total })}</span>
                {done > 0 && (
                  <button onClick={resetQuestionnaire} className="flex items-center gap-1 hover:text-indigo-600">
                    <RotateCcw size={11} />
                    {t('questionnaire.reset')}
                  </button>
                )}
              </div>
              <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all"
                  style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                />
              </div>

              <button
                onClick={() => setQuestionnaireOpen(true)}
                disabled={!consentAck}
                className="w-full py-2 px-3 bg-indigo-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play size={15} />
                {complete ? t('questionnaire.review') : done > 0 ? t('questionnaire.continue') : t('questionnaire.start')}
              </button>
              <button
                onClick={() => setQuestionnaireOpen(true, true)}
                disabled={!consentAck}
                className="w-full py-2 px-3 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Smartphone size={15} />
                {t('questionnaire.student_mode')}
              </button>
              <button
                onClick={() =>
                  printHandout(students, {
                    peersOn: peerEnabled && !skipPeers,
                    maxSeatmates: MAX_SEATMATES,
                    isRTL,
                    lang: uiLanguage,
                    fontFamily: LANG_FONTS[uiLanguage],
                    t,
                  })
                }
                disabled={total === 0}
                className="w-full py-2 px-3 text-indigo-600 dark:text-indigo-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Printer size={15} />
                {t('questionnaire.handout_button')}
              </button>
              {!consentAck && (
                <p className="text-[10px] text-amber-600 dark:text-amber-300">{t('questionnaire.consent_required')}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
