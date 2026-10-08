import { CalendarClock, ArrowUpRight, BookOpen, Users, ClipboardList, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { Action, Panel } from './SchoolComponents';
import type { Referral, SchoolClass, SchoolCommand, SchoolRole, SchoolWorkspace } from './types';
import OptimizationDashboard, { ClassOptimization } from './OptimizationDashboard';

export function DashboardOverview({ workspace, role, onClass, onCase, onPrimary }: { workspace: SchoolWorkspace; role: SchoolRole; onClass: (c: SchoolClass) => void; onCase: (r: Referral) => void; onPrimary: () => void }) {
  const { t } = useLanguage();
  const stats = role === 'teacher' ? ['classes', 'students', 'followUps'] as const : role === 'counselor' ? ['newCases', 'activeCases', 'followUps'] as const : ['classes', 'students', 'newCases', 'activeCases'] as const;
  const due = workspace.referrals.filter(ref => ref.status !== 'resolved' && workspace.recommendations.some(rec => rec.referralId === ref.id && rec.reviewDate <= new Date().toISOString().slice(0, 10)));
  return <div className="space-y-5">
    <OptimizationDashboard classes={workspace.classes} />
    <div className={`school-stats grid grid-cols-2 ${stats.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>{stats.map((key, index) => { const Icon = [BookOpen, Users, CalendarClock, ClipboardList][index]; return <div key={key} className="school-stat"><span className="school-stat-icon"><Icon size={21} aria-hidden="true" /></span><span className="mt-3 block text-3xl font-bold tabular-nums">{workspace.summary[key]}</span><span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">{t(`school.${key}`)}</span></div>; })}</div>
    <div className="school-next"><div><p className="school-accent text-sm font-bold">{t('school.nextStep')}</p><p className="mt-2 font-semibold">{t(`school.${role}Next`)}</p></div><Action onClick={onPrimary}>{t(role === 'teacher' ? (workspace.classes.some(c => c.students.length) ? 'school.newReferral' : 'school.shareClass') : role === 'counselor' ? 'school.cases' : 'school.addMember')}<ArrowUpRight size={18} aria-hidden="true" className="rtl:-scale-x-100" /></Action></div>
    {role === 'principal' ? <Panel title={t('school.principalTitle')} hint={t('school.aggregateHint')}><div className="grid gap-3 sm:grid-cols-3">{(['newCases', 'activeCases', 'resolvedCases'] as const).map(key => <div key={key} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-sm text-slate-600 dark:text-slate-300">{t(`school.${key}`)}</p><p className="mt-2 text-2xl font-bold tabular-nums">{workspace.summary[key]}</p></div>)}</div></Panel> : <Panel title={t(role === 'teacher' ? 'school.followUps' : 'school.newCases')}><div className="grid gap-3 sm:grid-cols-2">{(role === 'teacher' ? due : workspace.referrals.filter(r => r.status === 'new')).slice(0, 4).map(ref => <button key={ref.id} type="button" onClick={() => onCase(ref)} className="school-case-card text-start"><p className="font-bold">{ref.studentName}</p><p className="mt-1 text-sm">{ref.title}</p><span className="school-accent mt-3 inline-flex items-center gap-1 text-sm font-semibold">{t('school.openCase')}<ArrowUpRight size={16} aria-hidden="true" /></span></button>)}</div>{!(role === 'teacher' ? due : workspace.referrals.filter(r => r.status === 'new')).length && <p className="school-empty">{t('school.emptyCases')}</p>}</Panel>}
    <ClassList workspace={workspace} role={role} onOpen={onClass} />
    <Panel title={t('school.gettingStarted')}><p className="text-sm leading-7">{t(`school.guide${role.charAt(0).toUpperCase()}${role.slice(1)}`)}</p><p className="mt-3 text-sm leading-7">{t(`school.access_${role}`)}</p></Panel>
  </div>;
}

export function ClassList({ workspace, role, onOpen, onShare }: { workspace: SchoolWorkspace; role: SchoolRole; onOpen: (c: SchoolClass) => void; onShare?: () => void }) {
  const { t, uiLanguage } = useLanguage();
  return <Panel title={t('school.classes')} action={role !== 'counselor' && onShare ? <Action onClick={onShare}>{t('school.shareClass')}</Action> : undefined}>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{workspace.classes.map(c => <article key={c.id} className="school-class-card"><div className="school-stat-icon mb-4"><BookOpen size={23} aria-hidden="true" /></div><h3 className="font-bold">{c.name}</h3><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{c.studentCount} {t('school.students')}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('school.updated')}: {new Date(c.updatedAt).toLocaleDateString(uiLanguage)}</p><div className="mt-4"><Action secondary onClick={() => onOpen(c)}>{t('school.openClass')}</Action></div></article>)}</div>{!workspace.classes.length && <p className="school-empty">{t('school.emptyClasses')}</p>}
  </Panel>;
}

export function ClassDetail({ schoolClass }: { schoolClass: SchoolClass }) {
  return <ClassOptimization schoolClass={schoolClass} />;
}

export function StaffList({ workspace, onAdd, onCommand, busy }: { workspace: SchoolWorkspace; onAdd: () => void; onCommand: (c: SchoolCommand) => void; busy: boolean }) {
  const { t, uiLanguage } = useLanguage();
  return <Panel title={t('school.staff')} hint={t('school.memberHint')} action={<Action onClick={onAdd}>{t('school.addMember')}</Action>}><div className="grid gap-3 md:grid-cols-2">{workspace.members.map(m => {
    const expired = !!m.expiresAt && new Date(m.expiresAt).getTime() <= Date.now();
    return <article key={m.id} className="school-case-card"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{m.displayName}</h3><span className="inline-flex items-center gap-1 text-sm"><ShieldCheck size={16} aria-hidden="true" />{t(`school.${m.role}`)}</span></div><p className="mt-2 text-sm">{t(!m.active ? 'school.revoked' : expired ? 'school.expired' : 'school.active')}{m.expiresAt ? ` Â· ${new Date(m.expiresAt).toLocaleDateString(uiLanguage)}` : ''}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{m.classIds.map(id => workspace.classes.find(c => c.id === id)?.name).filter(Boolean).join(' Â· ')}</p>{m.active && <div className="mt-3"><Action secondary disabled={busy} onClick={() => { if (window.confirm(t('school.revokeConfirm'))) onCommand({ action: 'revoke_member', payload: { memberId: m.id } }); }}>{t('school.revoke')}</Action></div>}</article>;
  })}</div></Panel>;
}

export function Activity({ workspace }: { workspace: SchoolWorkspace }) {
  const { t, uiLanguage } = useLanguage();
  const labels: Record<string, string> = { create_school: 'createSchool', publish_class: 'shareClass', create_referral: 'newReferral', recommend: 'recommend', private_note: 'privateNote', outcome: 'outcome', set_status: 'cases', grant_member: 'addMember', revoke_member: 'revoke' };
  return <Panel title={t('school.activity')} hint={t('school.activityHint')}><div className="space-y-2">{workspace.audit.map(a => <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><span>{t(`school.${labels[a.action] ?? 'activity'}`)}</span><span className="text-slate-500 dark:text-slate-400">{new Date(a.createdAt).toLocaleString(uiLanguage)}</span></div>)}</div>{!workspace.audit.length && <p className="school-empty">{t('school.emptyActivity')}</p>}</Panel>;
}
