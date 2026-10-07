import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, LayoutDashboard, BookOpen, ClipboardList, Users, History, RefreshCw, LogOut, GraduationCap, ShieldCheck, Sun, Moon, Monitor } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import LanguageSelector from '../../components/LanguageSelector';
import AppUpdateBanner from '../../components/AppUpdateBanner';
import { cloudGateway, schoolRequest } from './api';
import { createDemoGateway } from './demo';
import AuthScreen, { schoolError } from './AuthScreen';
import MfaGate from './MfaGate';
import DemoOptimizer from './DemoOptimizer';
import { makeClassPublication } from './optimizationReport';
import { Action, SchoolDialog } from './SchoolComponents';
import { DashboardOverview, ClassList, ClassDetail, StaffList, Activity } from './Dashboards';
import { CaseList, CaseDetail } from './CaseViews';
import { SchoolMutationForm, ShareClassForm, FORM_LABELS, type FormKind } from './SchoolForms';
import type { Membership, SchoolCommand, SchoolContext, SchoolGateway, SchoolWorkspace } from './types';
import './school.css';

type View = 'home' | 'classes' | 'cases' | 'staff' | 'activity';
type Modal = { kind: 'case'; id: string } | { kind: 'class'; id: string } | { kind: FormKind; referralId?: string };
const keyOf = (m: SchoolContext) => `${m.schoolId}:${m.role}`;
function SchoolThemeControl() {
  const theme = useStore(s => s.theme); const setTheme = useStore(s => s.setTheme);
  const { t } = useLanguage();
  const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  return <button type="button" className="school-close" onClick={() => setTheme(next)} aria-label={t(`theme.${next}`)} title={`${t('theme.label')}: ${t(`theme.${theme}`)}`}><Icon size={20} aria-hidden="true" /></button>;
}
export default function SchoolPortal({ previewLocal = false, entryRole }: { previewLocal?: boolean; entryRole?: Membership['role'] }) {
  const { t } = useLanguage();
  useTheme();
  const [demoGateway, setDemoGateway] = useState<SchoolGateway | null>(null);
  const gateway = demoGateway ?? cloudGateway;
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [available, setAvailable] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [context, setContext] = useState<Membership | null>(null);
  const [workspace, setWorkspace] = useState<SchoolWorkspace | null>(null);
  const [view, setView] = useState<View>('home');
  const [modal, setModal] = useState<Modal | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const requestId = useRef(0);
  const bootstrapId = useRef(0);
  const previewStarted = useRef(false);
  const localResult = useStore(s => s.result);
  const localStudents = useStore(s => s.students);

  const bootstrap = useCallback(async () => {
    const epoch = ++bootstrapId.current;
    setLoading(true); setWorkspace(null); setModal(null); setError('');
    try {
      const result = await gateway.bootstrap();
      if (epoch !== bootstrapId.current) return;
      setAvailable(result.available); setSignedIn(result.signedIn); setMemberships(result.memberships);
      setMfaRequired(result.mfaRequired ?? false);
      // A requested entrance selects only an existing server-authorized membership.
      setContext(result.mfaRequired ? null : (result.memberships.find(m => m.role === entryRole) ?? (demoGateway ? result.memberships[0] : result.memberships.find(m => m.role === 'principal') ?? result.memberships[0])) ?? null);
    } catch { if (epoch === bootstrapId.current) { setAvailable(false); setSignedIn(false); setMemberships([]); setContext(null); } }
    finally { if (epoch === bootstrapId.current) setLoading(false); }
  }, [gateway, demoGateway, entryRole]);
  useEffect(() => {
    const bootstrapEpoch = bootstrapId; const requestEpoch = requestId;
    void bootstrap();
    return () => { bootstrapEpoch.current++; requestEpoch.current++; };
  }, [bootstrap]);

  const refresh = useCallback(async () => {
    if (!context) return;
    const epoch = ++requestId.current;
    setLoading(true);
    try {
      const data = await gateway.workspace(context);
      if (epoch === requestId.current) { setWorkspace(data); setError(''); }
    } catch (e) {
      if (epoch === requestId.current) { setWorkspace(null); setModal(null); setError(schoolError(e, t)); }
    } finally { if (epoch === requestId.current) setLoading(false); }
  }, [context, gateway, t]);
  useEffect(() => {
    const requestEpoch = requestId;
    setWorkspace(null); setModal(null); setMessage(''); setView('home');
    void refresh();
    // Refresh live permissions after a tab becomes visible. Background work
    // contains no queued writes and cannot silently restore a revoked class.
    const visible = () => { if (!document.hidden) { setWorkspace(null); setModal(null); void refresh(); } };
    const offline = () => { requestEpoch.current++; setWorkspace(null); setModal(null); setLoading(false); setError(t('school.error_unavailable')); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('offline', offline);
    window.addEventListener('online', visible);
    const interval = window.setInterval(() => { if (!document.hidden) void refresh(); }, 60_000);
    return () => { requestEpoch.current++; document.removeEventListener('visibilitychange', visible); window.removeEventListener('offline', offline); window.removeEventListener('online', visible); window.clearInterval(interval); };
  }, [refresh, t]);

  const closeModal = useCallback(() => { setModal(null); setError(''); }, []);
  async function command(command: SchoolCommand) {
    if (!context || busy) return false;
    setBusy(true); setError(''); setMessage('');
    try {
      await gateway.command(context, command);
      await refresh();
      setMessage(t('school.saved')); setModal(null);
      return true;
    } catch (e) { await refresh(); setError(schoolError(e, t)); return false; }
    finally { setBusy(false); }
  }
  const startDemo = useCallback((local = false) => {
    const state = useStore.getState();
    const publication = local && state.result && state.students.length ? makeClassPublication(t('school.currentClass'), state.students, state.result, state.layoutDef, state.constraints) : undefined;
    requestId.current++; bootstrapId.current++;
    setContext(null); setWorkspace(null); setModal(null); setDemoGateway(createDemoGateway(t, publication));
  }, [t]);
  useEffect(() => {
    if (previewLocal && localResult && localStudents.length && !previewStarted.current) {
      previewStarted.current = true; startDemo(true);
    }
  }, [previewLocal, localResult, localStudents.length, startDemo]);
  async function exit() {
    if (busy) return;
    requestId.current++; bootstrapId.current++; setWorkspace(null); setModal(null); setContext(null); setMemberships([]); setMessage(''); setSignedIn(false);
    if (demoGateway) setDemoGateway(null);
    else { try { await schoolRequest('logout'); } catch { setError(t('school.error_unavailable')); } }
  }
  function changeContext(key: string) {
    if (context && keyOf(context) === key) return;
    requestId.current++; setWorkspace(null); setModal(null); setError(''); setMessage('');
    setContext(memberships.find(m => keyOf(m) === key) ?? null);
  }
  const role = context?.role ?? 'teacher';
  const tabs: { key: View; icon: typeof LayoutDashboard }[] = role === 'principal' ? [{ key: 'home', icon: LayoutDashboard }, { key: 'classes', icon: BookOpen }, { key: 'staff', icon: Users }, { key: 'activity', icon: History }] : [{ key: 'home', icon: LayoutDashboard }, { key: 'classes', icon: BookOpen }, { key: 'cases', icon: ClipboardList }];
  const selectedReferral = modal && ('referralId' in modal ? workspace?.referrals.find(r => r.id === modal.referralId) : modal.kind === 'case' ? workspace?.referrals.find(r => r.id === modal.id) : undefined);
  const selectedClass = modal?.kind === 'class' ? workspace?.classes.find(c => c.id === modal.id) : undefined;
  const formKind = modal && modal.kind !== 'case' && modal.kind !== 'class' ? modal.kind : null;
  const primary = () => {
    setError('');
    if (role === 'counselor') setView('cases');
    else setModal({ kind: role === 'principal' ? 'grant_member' : workspace?.classes.some(c => c.students.length) ? 'create_referral' : 'publish_class' });
  };
  const nav = <nav aria-label={t('school.entry')} className="school-nav">{tabs.map(({ key, icon: Icon }) => <button key={key} type="button" className={view === key ? 'school-nav-button school-nav-active' : 'school-nav-button'} aria-current={view === key ? 'page' : undefined} onClick={() => { setView(key); setModal(null); }}><Icon size={20} aria-hidden="true" /><span>{t(`school.${key}`)}</span></button>)}</nav>;
  return <div className={`school-shell school-role-${role}`} data-testid="school-portal">
    <AppUpdateBanner />
    <a href="#school-main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">{t('app.skip_to_content')}</a>
    <header className="school-header"><a href="#" className="school-close" aria-label={t('school.back')}><ArrowLeft size={21} className="rtl:rotate-180" aria-hidden="true" /></a><a href="#home" className="school-close" aria-label={t('app.home')}><img src="/seatai-logo.svg" width={30} height={30} alt="" aria-hidden="true" className="rounded-lg" /></a><span className="min-w-0 flex-1 truncate text-sm font-bold sm:text-base">{context?.schoolName ?? 'SeatAI'}</span><LanguageSelector /><SchoolThemeControl />{signedIn && <button type="button" className="school-close" disabled={busy} aria-label={t('school.logout')} onClick={() => void exit()}><LogOut size={20} aria-hidden="true" /></button>}</header>
    {demoGateway && <div className="school-demo-banner"><div><strong>{t('school.demo')}</strong><p className="mt-1 text-xs leading-relaxed sm:text-sm">{t('school.demoHint')}</p></div><button type="button" disabled={busy} onClick={() => startDemo()} className="school-button-secondary shrink-0">{t('school.resetDemo')}</button></div>}
    <div className="school-body">{context && <aside className="school-sidebar"><div className="school-role-badge"><GraduationCap size={24} aria-hidden="true" /><span>{t(`school.${role}`)}</span></div>{nav}</aside>}
      <main id="school-main" className="school-main">
        {demoGateway ? <DemoOptimizer onResult={publication => { requestId.current++; bootstrapId.current++; setWorkspace(null); setContext(null); setDemoGateway(createDemoGateway(t, publication)); }} /> : context && <section className="school-class-bridge">
          <div><h2>{t(localResult ? 'school.resultReady' : 'school.connectClassTitle')}</h2><p>{t(localResult ? 'school.resultReadyHint' : 'school.connectClassHint')}</p></div>
          <div className="flex flex-wrap gap-2">{localResult && <Action secondary onClick={() => startDemo(true)}>{t('school.previewCurrent')}</Action>}
          {context && role !== 'counselor' && localStudents.length > 0 && <Action onClick={() => { setError(''); setModal({ kind: 'publish_class' }); }}>{t('school.publishResult')}</Action>}
          <Action secondary onClick={() => startDemo()}>{t('school.samplePresentation')}</Action>
          {!localResult && <a className="school-button-secondary" href="#">{t('school.back')}</a>}</div>
        </section>}
        {context && !demoGateway && <div className="school-access-note"><ShieldCheck size={18} aria-hidden="true" /><div><strong>{context.displayName} · {t(`school.${role}`)}</strong><p>{t(context.isOwner ? 'school.ownerAccess' : `school.access_${role}`)}</p><p>{t('school.roleAssignmentHint')}</p></div></div>}

        {context && <><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="school-accent mb-2 flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} aria-hidden="true" />{t(`school.${role}`)}</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t(`school.${role}Title`)}</h1><p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t(`school.${role}Intro`)}</p></div><label className="w-full text-sm font-semibold sm:w-72"><span className="mb-2 block">{t('school.context')}</span><select aria-label={t('school.context')} className="school-input" value={keyOf(context)} disabled={busy} onChange={e => changeContext(e.target.value)}>{memberships.map(m => <option key={keyOf(m)} value={keyOf(m)}>{m.schoolName} · {t(`school.${m.role}`)}</option>)}</select></label></div><div className="mb-5 flex flex-wrap gap-2"><Action secondary onClick={() => void refresh()} disabled={loading || busy}><RefreshCw size={17} aria-hidden="true" />{t('school.refresh')}</Action>{role !== 'counselor' && <Action secondary onClick={() => { setError(''); setModal({ kind: 'publish_class' }); }}>{t('school.shareClass')}</Action>}</div></>}
        {error && <p role="alert" className="school-error mb-4">{error}</p>}{message && <p role="status" className="mb-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">{message}</p>}
        {loading && !workspace ? <p role="status" className="school-panel">{t('school.loading')}</p> : signedIn && mfaRequired ? <MfaGate onReady={bootstrap} /> : !context ? <AuthScreen available={available} signedIn={signedIn} onReady={bootstrap} onDemo={() => startDemo()} entryRole={entryRole} /> : workspace ? <>
          {view === 'home' && <DashboardOverview workspace={workspace} role={role} onClass={c => setModal({ kind: 'class', id: c.id })} onCase={r => setModal({ kind: 'case', id: r.id })} onPrimary={primary} />}
          {view === 'classes' && <ClassList workspace={workspace} role={role} onOpen={c => setModal({ kind: 'class', id: c.id })} onShare={() => { setError(''); setModal({ kind: 'publish_class' }); }} />}
          {view === 'cases' && role !== 'principal' && <><div className="mb-4">{role === 'teacher' && <Action onClick={primary}>{t('school.newReferral')}</Action>}</div><CaseList workspace={workspace} onOpen={r => setModal({ kind: 'case', id: r.id })} /></>}
          {view === 'staff' && role === 'principal' && <StaffList workspace={workspace} onAdd={() => { setError(''); setModal({ kind: 'grant_member' }); }} onCommand={c => void command(c)} busy={busy} />}
          {view === 'activity' && role === 'principal' && <Activity workspace={workspace} />}
        </> : null}
      </main>
    </div>{context && <div className="school-bottom-nav">{nav}</div>}
    {workspace && modal && <SchoolDialog title={selectedClass?.name ?? selectedReferral?.studentName ?? (formKind ? t(`school.${FORM_LABELS[formKind]}`) : t('school.cases'))} onClose={closeModal} busy={busy}>
      {modal.kind === 'case' && selectedReferral && <><CaseDetail referral={selectedReferral} workspace={workspace} role={role} onAction={kind => { setError(''); setModal({ kind, referralId: selectedReferral.id }); }} onCommand={c => void command(c)} busy={busy} />{error && <p role="alert" className="school-error mt-4">{error}</p>}</>}
      {selectedClass && <ClassDetail schoolClass={selectedClass} />}
      {formKind && (demoGateway && (formKind === 'publish_class' || formKind === 'grant_member') ? <p className="school-empty">{t('school.error_demo_only')}</p> : formKind === 'publish_class' ? <ShareClassForm workspace={workspace} busy={busy} onSave={command} error={error} /> : <SchoolMutationForm key={`${formKind}-${selectedReferral?.id ?? ''}`} kind={formKind} workspace={workspace} referral={selectedReferral ?? undefined} busy={busy} onSave={command} error={error} />)}
    </SchoolDialog>}
  </div>;
}
