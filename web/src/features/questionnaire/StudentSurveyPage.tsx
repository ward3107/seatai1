import { useEffect, useState, useRef } from 'react';
import { translate, type UILanguage } from '../../lib/i18n';
import { emptyAnswers, type SurveyAnswers } from './surveyMapping';
const QUESTIONS = [
  { field:'frontPreference', key:'q_focus', options:['front','middle','back'], labels:'focus_' },
  { field:'noise', key:'q_noise', hint:'q_noise_scale' },
  { field:'belonging', key:'q_belonging', hint:'q_belonging_scale' },
  { field:'learningStyle', key:'q_learning_style', options:['alone','pair','group'], labels:'learn_' },
  { field:'teacherAttention', key:'q_teacher_attention', hint:'q_teacher_attention_scale' },
  { field:'focusDifficulty', key:'q_focus_difficulty', hint:'q_focus_difficulty_hint' },
  { field:'selfEfficacy', key:'q_self_efficacy', hint:'q_self_efficacy_hint' },
  { field:'movement', key:'q_movement', hint:'q_movement_hint' },
  { field:'visionDifficulty', key:'q_vision', hint:'q_vision_hint' },
] as const;
export default function StudentSurveyPage({ token }: { token: string }) {
  const [language, setLanguage] = useState<UILanguage>('he');
  const t = (key: string) => translate(language, key);
  const isRTL = language === 'he' || language === 'ar';
  const [state, setState] = useState<'loading'|'notice'|'ready'|'error'|'done'|'deleted'>('loading');
  const [notice, setNotice] = useState<{ schoolName:string; privacyEmail:string; processors:string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [step,setStep] = useState(0);
  const [answers,setAnswers] = useState<SurveyAnswers>(emptyAnswers());
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [language,isRTL]);
  useEffect(() => { heading.current?.focus(); }, [step,state]);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/survey-response',{ headers:{ Authorization:`Bearer ${token}` }, signal:controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (['he','en','ar','ru'].includes(data.language)) setLanguage(data.language);
      if (!data.notice?.schoolName || !data.notice?.privacyEmail || !data.notice?.processors) throw new Error();
      setNotice(data.notice);
      setState(data.submitted ? 'done' : 'notice');
    }).catch(() => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  },[token]);
  const question = QUESTIONS[step];
  async function submit() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/survey-response',{ method:'POST',headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },body:JSON.stringify({ answers, noticeAcknowledged:true }) });
      if (!response.ok) throw new Error();
      setAnswers(emptyAnswers());
      setState('done');
    } catch { setError(t('phoneSurvey.retry')); } finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm(t('pupilPrivacy.deleteConfirm'))) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/survey-response',{ method:'DELETE',headers:{ Authorization:`Bearer ${token}` } });
      if (!response.ok) throw new Error();
      setAnswers(emptyAnswers()); setState('deleted');
      history.replaceState(null, '', location.pathname);
    } catch { setError(t('pupilPrivacy.deleteError')); } finally { setBusy(false); }
  }
  return <main dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-primary-50 px-4 py-10 text-gray-800">
    <div className="max-w-lg mx-auto rounded-3xl bg-white shadow-lg p-6">
      <img src="/seatai-logo.svg" width="48" height="48" alt="SeatAI" className="rounded-xl mb-5" />
      <h1 className="text-2xl font-bold mb-3">{t('phoneSurvey.studentTitle')}</h1>
      {state === 'loading' && <p role="status">{t('phoneSurvey.loading')}</p>}
      {state === 'error' && <p role="alert">{t('phoneSurvey.linkError')}</p>}
      {state === 'done' && <p role="status">{t('phoneSurvey.thanks')}</p>}
      {state === 'deleted' && <p role="status">{t('pupilPrivacy.deleted')}</p>}
      {notice && state !== 'deleted' && <details open={state === 'notice'} className="my-4 rounded-xl bg-primary-50 p-4 text-sm">
        <summary className="cursor-pointer font-semibold">{t('pupilPrivacy.title')}</summary>
        <p className="mt-3 font-semibold">{notice.schoolName}</p>
        <p className="mt-2">{t('pupilPrivacy.explanation')}</p>
        <p className="mt-2">{t('pupilPrivacy.retention')}</p>
        <p className="mt-2">{notice.processors}</p>
        <p className="mt-2">{t('pupilPrivacy.contact')} <a className="underline break-all" href={`mailto:${notice.privacyEmail}`}>{notice.privacyEmail}</a></p>
      </details>}
      {state === 'notice' && <button className="w-full rounded-xl bg-primary-700 px-4 py-3 text-white font-semibold" onClick={() => setState('ready')}>{t('pupilPrivacy.start')}</button>}
      {state === 'done' && <button disabled={busy} onClick={() => void remove()} className="mt-4 underline text-sm text-rose-800">{t('pupilPrivacy.delete')}</button>}
      {state === 'ready' && <>
        <p className="text-sm mb-6">{t('phoneSurvey.studentIntro')}</p>
        <p className="text-xs text-primary-800 mb-2">{step + 1} / {QUESTIONS.length}</p>
        <div className="h-2 rounded bg-primary-100 mb-6"><div className="h-full rounded bg-primary-600" style={{width:`${(step + 1) / QUESTIONS.length * 100}%`}} /></div>
        <h2 ref={heading} className="text-xl font-semibold mb-3" tabIndex={-1} key={question.key}>{t(`questionnaire.${question.key}`)}</h2>
        {'hint' in question && <p className="text-sm text-gray-600 mb-4">{t(`questionnaire.${question.hint}`)}</p>}
        <div className="flex flex-wrap gap-2 mb-6">
          {('options' in question ? question.options : [1,2,3,4,5]).map(value => <button key={value} aria-pressed={answers[question.field] === value}
            onClick={() => setAnswers(a => ({ ...a,[question.field]:a[question.field] === value ? null : value }))}
            className={`min-w-12 min-h-12 px-3 rounded-xl border font-semibold ${answers[question.field] === value ? 'bg-primary-700 text-white border-primary-700' : 'bg-primary-50 border-primary-200'}`}>
            {'labels' in question ? t(`questionnaire.${question.labels}${value}`) : value}
          </button>)}
        </div>
        <button className="text-sm underline mb-5" onClick={() => { setAnswers(a => ({...a,[question.field]:null})); if (step < QUESTIONS.length - 1) setStep(step + 1); }}>{t('phoneSurvey.skip')}</button>
        <div className="flex justify-between gap-3">
          <button disabled={step === 0 || busy} className="px-4 py-3 border rounded-xl disabled:opacity-40" onClick={() => setStep(step - 1)}>{t('phoneSurvey.back')}</button>
          <button disabled={busy} className="px-6 py-3 bg-primary-700 text-white rounded-xl disabled:opacity-50" onClick={() => step === QUESTIONS.length - 1 ? void submit() : setStep(step + 1)}>{t(step === QUESTIONS.length - 1 ? 'questionnaire.submit' : 'phoneSurvey.next')}</button>
        </div>
      </>}
      {error && <p role="alert" className="text-rose-700 text-sm mt-3">{error}</p>}
    </div>
  </main>;
}
