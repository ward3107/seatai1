import { useState } from 'react';
import { ArrowUpRight, CalendarClock, LockKeyhole, MessageSquareText, ClipboardCheck } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { Action, Field, Panel, Status } from './SchoolComponents';
import type { CaseStatus, Referral, SchoolCommand, SchoolRole, SchoolWorkspace } from './types';

export type CaseAction = 'recommend' | 'private_note' | 'outcome';
export function CaseList({ workspace, onOpen }: { workspace: SchoolWorkspace; onOpen: (referral: Referral) => void }) {
  const { t, uiLanguage } = useLanguage();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CaseStatus | ''>('');
  const visible = workspace.referrals.filter(r => (!status || r.status === status) && `${r.studentName} ${r.title}`.toLocaleLowerCase(uiLanguage).includes(search.toLocaleLowerCase(uiLanguage)));
  return <Panel title={t('school.cases')}>
    <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_12rem]"><Field label={t('school.search')}><input className="school-input" type="search" maxLength={100} value={search} onChange={e => setSearch(e.target.value)} /></Field><Field label={t('school.allStatuses')}><select className="school-input" value={status} onChange={e => setStatus(e.target.value as CaseStatus | '')}><option value="">{t('school.allStatuses')}</option>{(['new', 'in_progress', 'resolved'] as const).map(s => <option key={s} value={s}>{t(`school.${s}`)}</option>)}</select></Field></div>
    <div className="grid gap-3">{visible.map(ref => <button type="button" key={ref.id} onClick={() => onOpen(ref)} className="school-case-card text-start">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold">{ref.studentName}</span><Status status={ref.status} /></div>
      <p className="mt-2 font-semibold text-slate-700 dark:text-slate-200">{ref.title}</p><p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{ref.detail}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-slate-500 dark:text-slate-400">{workspace.classes.find(c => c.id === ref.classId)?.name} · {new Date(ref.createdAt).toLocaleDateString(uiLanguage)}</span><span className="school-accent flex items-center gap-1 font-semibold">{t('school.openCase')}<ArrowUpRight size={16} className="rtl:-scale-x-100" aria-hidden="true" /></span></div>
    </button>)}</div>{!visible.length && <p className="school-empty">{t('school.emptyCases')}</p>}
  </Panel>;
}

export function CaseDetail({ referral, workspace, role, onAction, onCommand, busy }: { referral: Referral; workspace: SchoolWorkspace; role: SchoolRole; onAction: (action: CaseAction) => void; onCommand: (command: SchoolCommand) => void; busy: boolean }) {
  const { t, uiLanguage } = useLanguage();
  const recommendations = workspace.recommendations.filter(r => r.referralId === referral.id);
  const outcomes = workspace.outcomes.filter(o => o.referralId === referral.id);
  const notes = role === 'counselor' ? workspace.privateNotes.filter(n => n.referralId === referral.id) : [];
  const date = (value: string) => new Date(value).toLocaleDateString(uiLanguage);
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold">{referral.studentName}</h3><Status status={referral.status} /></div>
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><p className="font-semibold">{referral.title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{referral.detail}</p><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{workspace.classes.find(c => c.id === referral.classId)?.name} · {date(referral.createdAt)}</p></div>
    <section><h3 className="mb-3 flex items-center gap-2 font-bold text-sky-800 dark:text-sky-200"><MessageSquareText size={19} aria-hidden="true" />{t('school.recommendations')}</h3><div className="space-y-3">{recommendations.map(rec => <article key={rec.id} className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/40"><p className="whitespace-pre-wrap text-sm leading-relaxed">{rec.body}</p><p className="mt-3 text-sm font-semibold">{t('school.goal')}: {rec.goal}</p><p className="mt-2 flex items-center gap-2 text-sm text-sky-800 dark:text-sky-200"><CalendarClock size={16} aria-hidden="true" />{t('school.reviewDate')}: {date(`${rec.reviewDate}T12:00:00`)}</p></article>)}</div>
      {role === 'counselor' && <div className="mt-3"><Action disabled={busy} onClick={() => onAction('recommend')}>{t('school.recommend')}</Action></div>}
    </section>
    <section><h3 className="mb-3 flex items-center gap-2 font-bold text-teal-800 dark:text-teal-200"><ClipboardCheck size={19} aria-hidden="true" />{t('school.outcomes')}</h3><div className="space-y-3">{outcomes.map(outcome => <article key={outcome.id} className="rounded-2xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-950/40"><p className="whitespace-pre-wrap text-sm leading-relaxed">{outcome.body}</p><p className="mt-2 text-xs text-teal-800 dark:text-teal-200">{date(outcome.createdAt)}</p></article>)}</div>{role === 'teacher' && <div className="mt-3"><Action disabled={busy} onClick={() => onAction('outcome')}>{t('school.outcome')}</Action></div>}</section>
    {role === 'counselor' && <section data-testid="school-private-notes" className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/40"><h3 className="flex items-center gap-2 font-bold text-violet-800 dark:text-violet-200"><LockKeyhole size={19} aria-hidden="true" />{t('school.privateNotes')}</h3><p className="mt-2 text-sm text-violet-800 dark:text-violet-200">{t('school.privateHint')}</p>{notes.map(note => <article key={note.id} className="mt-3 rounded-xl bg-white p-3 dark:bg-slate-900"><p className="whitespace-pre-wrap text-sm leading-relaxed">{note.body}</p><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{date(note.createdAt)}</p></article>)}<div className="mt-3"><Action secondary disabled={busy} onClick={() => onAction('private_note')}>{t('school.privateNote')}</Action></div></section>}
    {role === 'counselor' && <Action secondary disabled={busy} onClick={() => onCommand({ action: 'set_status', payload: { referralId: referral.id, status: referral.status === 'resolved' ? 'in_progress' : 'resolved' } })}>{t(referral.status === 'resolved' ? 'school.reopenCase' : 'school.closeCase')}</Action>}
  </div>;
}
