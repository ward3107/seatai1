import { useState, type FormEvent } from 'react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { Field } from './SchoolComponents';
import type { Referral, SchoolCommand, SchoolWorkspace } from './types';
import { makeClassPublication } from './optimizationReport';

export type FormKind = 'create_referral' | 'recommend' | 'private_note' | 'outcome' | 'grant_member' | 'publish_class';
export const FORM_LABELS: Record<FormKind, string> = { create_referral: 'newReferral', recommend: 'recommend', private_note: 'privateNote', outcome: 'outcome', grant_member: 'addMember', publish_class: 'shareClass' };
type FormProps = { workspace: SchoolWorkspace; kind: FormKind; referral?: Referral; busy: boolean; onSave: (command: SchoolCommand) => Promise<boolean>; error: string };

export function SchoolMutationForm({ workspace, kind, referral, busy, onSave, error }: FormProps) {
  const { t } = useLanguage();
  const [classId, setClassId] = useState(workspace.classes.find(c => c.students.length)?.id ?? '');
  const [studentId, setStudentId] = useState(workspace.classes.find(c => c.students.length)?.students[0]?.id ?? '');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? '').trim();
    let command: SchoolCommand;
    if (kind === 'create_referral') command = { action: kind, payload: { classId, studentId, title: value('title'), detail: value('detail') } };
    else if (kind === 'recommend' && referral) command = { action: kind, payload: { referralId: referral.id, body: value('body'), goal: value('goal'), reviewDate: value('reviewDate') } };
    else if ((kind === 'private_note' || kind === 'outcome') && referral) command = { action: kind, payload: { referralId: referral.id, body: value('body') } };
    else if (kind === 'grant_member') command = { action: kind, payload: { email: value('email'), displayName: value('displayName'), role: value('role') as 'teacher' | 'counselor' | 'principal', classIds: data.getAll('classIds').map(String), expiresAt: value('expiresAt') ? `${value('expiresAt')}T23:59:59Z` : null } };
    else return;
    await onSave(command);
  }
  return <form onSubmit={submit} className="space-y-4">
    {kind === 'create_referral' && <>
      <Field label={t('school.class')}><select name="classId" className="school-input" required value={classId} onChange={e => { setClassId(e.target.value); setStudentId(workspace.classes.find(c => c.id === e.target.value)?.students[0]?.id ?? ''); }}>{workspace.classes.filter(c => c.students.length).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label={t('school.student')}><select name="studentId" className="school-input" required value={studentId} onChange={e => setStudentId(e.target.value)}>{workspace.classes.find(c => c.id === classId)?.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label={t('school.title')}><input name="title" className="school-input" required maxLength={150} /></Field><Field label={t('school.detail')}><textarea name="detail" className="school-input" rows={4} required maxLength={2000} /></Field>
    </>}
    {kind === 'recommend' && <>
      <Field label={t('school.recommendationBody')}><textarea name="body" className="school-input" rows={4} required maxLength={2000} /></Field><Field label={t('school.goal')}><input name="goal" className="school-input" required maxLength={500} /></Field><Field label={t('school.reviewDate')}><input name="reviewDate" type="date" className="school-input" required min={new Date().toISOString().slice(0, 10)} /></Field>
      <label className="school-check"><input type="checkbox" required />{t('school.shareAck')}</label>
    </>}
    {(kind === 'private_note' || kind === 'outcome') && <><p className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed dark:bg-slate-800">{t(kind === 'private_note' ? 'school.privateHint' : 'school.outcomeBody')}</p><Field label={t(kind === 'private_note' ? 'school.noteBody' : 'school.outcomeBody')}><textarea name="body" className="school-input" rows={5} required maxLength={kind === 'private_note' ? 4000 : 2000} /></Field></>}
    {kind === 'grant_member' && <>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t('school.memberHint')}</p><Field label={t('school.email')}><input name="email" type="email" className="school-input" dir="ltr" required maxLength={254} autoComplete="email" /></Field><Field label={t('school.displayName')}><input name="displayName" className="school-input" required maxLength={100} /></Field><Field label={t('school.role')}><select name="role" className="school-input">{(['teacher', 'counselor', 'principal'] as const).map(role => <option key={role} value={role}>{t(`school.${role}`)}</option>)}</select></Field>
      <fieldset><legend className="mb-2 text-sm font-semibold">{t('school.assignedClasses')}</legend><div className="grid gap-2 sm:grid-cols-2">{workspace.classes.map(c => <label key={c.id} className="school-check"><input name="classIds" value={c.id} type="checkbox" />{c.name}</label>)}</div></fieldset><Field label={t('school.expiresAt')}><input name="expiresAt" type="date" className="school-input" min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} /></Field>
    </>}
    {error && <p role="alert" className="school-error">{error}</p>}<button type="submit" className="school-button w-full" disabled={busy || (kind === 'create_referral' && !studentId)}>{busy ? t('school.loading') : t('school.save')}</button>
  </form>;
}

/** Mounted only after an authorized teacher or principal explicitly opens sharing. */
export function ShareClassForm({ workspace, busy, onSave, error }: Omit<FormProps, 'kind' | 'referral'>) {
  const projects = useStore(s => s.projects);
  const currentStudents = useStore(s => s.students);
  const currentRows = useStore(s => s.rows);
  const currentCols = useStore(s => s.cols);
  const currentResult = useStore(s => s.result);
  const currentLayout = useStore(s => s.layoutDef);
  const currentConstraints = useStore(s => s.constraints);
  const { t } = useLanguage();
  const [source, setSource] = useState(currentStudents.length ? 'current' : projects[0]?.id ?? '');
  const [target, setTarget] = useState('');
  const project = projects.find(p => p.id === source);
  const students = source === 'current' ? currentStudents : project?.students ?? [];
  const name = project?.name ?? '';
  const result = source === 'current' ? currentResult : project?.result;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget);
    await onSave({ action: 'publish_class', payload: {
      ...makeClassPublication(String(data.get('name') ?? '').trim(), students, result,
        source === 'current' ? currentLayout : project?.layoutDef ?? { type: 'rows', rows: project?.rows ?? currentRows, cols: project?.cols ?? currentCols },
        source === 'current' ? currentConstraints : project!.constraints),
      ...(target ? { classId: target } : {}),
    } });
  }
  if (!students.length && !projects.length) return <p className="school-empty">{t('school.noLocalClass')}</p>;
  return <form onSubmit={submit} className="space-y-4"><p className="rounded-2xl bg-sky-50 p-4 text-sm leading-relaxed text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">{t('school.sharingHint')}</p><Field label={t('school.sourceClass')}><select className="school-input" value={source} onChange={e => setSource(e.target.value)}>{!!currentStudents.length && <option value="current">{t('school.currentClass')}</option>}{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label={t('school.shareTarget')}><select className="school-input" value={target} onChange={e => setTarget(e.target.value)}><option value="">{t('school.newClass')}</option>{workspace.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label={t('school.className')}><input key={`${source}-${target}`} name="name" className="school-input" required maxLength={100} defaultValue={workspace.classes.find(c => c.id === target)?.name ?? name} /></Field><div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="mb-2 text-sm font-bold">{students.length} {t('school.students')}</p><p className="text-sm leading-7">{students.map(s => s.name).join(' · ')}</p></div><label className="school-check"><input type="checkbox" required />{t('school.sharingAck')}</label>{error && <p role="alert" className="school-error">{error}</p>}<button className="school-button w-full" type="submit" disabled={busy || !students.length || students.length > 60}>{busy ? t('school.loading') : t('school.shareClass')}</button></form>;
}
