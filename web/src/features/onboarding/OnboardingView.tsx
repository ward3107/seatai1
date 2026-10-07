import { ArrowUpLeft, ArrowUpRight, BookOpen, Building2, HeartHandshake, ShieldCheck, UserPlus } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { SAMPLE_CLASSES } from '../../utils/sampleData';
import TeacherQuickGuide from '../../components/TeacherQuickGuide';
import ClassroomPreview from '../../components/ClassroomPreview';
import '../../styles/entry.css';

const roles = [{ role: 'teacher', Icon: BookOpen }, { role: 'counselor', Icon: HeartHandshake }, { role: 'principal', Icon: Building2 }] as const;
export default function OnboardingView() {
  const setStudents = useStore(s => s.setStudents);
  const setLayoutDef = useStore(s => s.setLayoutDef);
  const startWizard = useStore(s => s.startWizard);
  const setHomeView = useStore(s => s.setHomeView);
  const { t, isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowUpLeft : ArrowUpRight;
  function loadSampleClass(id: typeof SAMPLE_CLASSES[number]['id']) {
    const sample = SAMPLE_CLASSES.find(c => c.id === id);
    if (!sample) return;
    if (useStore.getState().students.length > 0 && !window.confirm(t('wizard.confirm_sample_replace'))) return;
    setStudents(JSON.parse(JSON.stringify(sample.students)));
    setLayoutDef({ type: 'rows', rows: sample.rows, cols: sample.cols });
    setHomeView(false);
  }
  return <div className="entry-page">
    <section className="entry-hero" aria-labelledby="entry-title">
      <div className="entry-hero-copy">
        <p className="entry-product">{t('entry.product')}</p>
        <h1 id="entry-title"><span className="block">{t('entry.titleStart')}</span><span className="block">{t('entry.titleEnd')}</span></h1>
        <p className="entry-intro">{t('entry.intro')}</p>
        <div className="entry-actions"><button type="button" onClick={() => startWizard()} className="entry-primary"><UserPlus size={19} aria-hidden="true" />{t('onboarding.get_started')}</button><a className="entry-secondary" href="#sample-classes">{t('teacherFlow.tryDemo')}</a></div>
        <p className="entry-reassurance"><ShieldCheck size={16} aria-hidden="true" />{t('entry.localHint')}</p>
        <a href="#school" className="entry-team-link"><Building2 size={18} aria-hidden="true" /><span>{t('entry.teamLink')}</span><Arrow size={17} aria-hidden="true" /></a>
      </div>
      <ClassroomPreview />
    </section>
    <section id="sample-classes" className="entry-samples" aria-labelledby="sample-classes-title">
      <div><h2 id="sample-classes-title">{t('entry.sampleTitle')}</h2><p>{t('entry.sampleHint')}</p></div>
      <div className="entry-sample-options">{SAMPLE_CLASSES.map(sample => <button type="button" key={sample.id} onClick={() => loadSampleClass(sample.id)} className="sample-class-button"><strong>{sample.students.length}</strong><span>{t('app.students')}</span><Arrow size={17} aria-hidden="true" /></button>)}</div>
    </section>
    <section className="entry-team" aria-labelledby="entry-team-title">
      <div className="entry-section-heading"><div><h2 id="entry-team-title">{t('entry.teamTitle')}</h2><p>{t('entry.teamIntro')}</p></div><a className="entry-secondary" href="#school">{t('entry.teamLogin')}</a></div>
      <div className="entry-roles">{roles.map(({ role, Icon }) => <a key={role} className={`entry-role entry-role-${role}`} href={`#school-${role}`}><Icon size={27} strokeWidth={1.6} aria-hidden="true" /><h3>{t(`school.${role}`)}</h3><p>{t(`entry.${role}Description`)}</p><span>{t(`entry.${role}Login`)}<Arrow size={17} aria-hidden="true" /></span></a>)}</div>
      <p className="entry-access-note"><ShieldCheck size={18} aria-hidden="true" />{t('entry.accessHint')}</p>
    </section>
    <div className="entry-how"><TeacherQuickGuide /></div>
    <footer className="entry-footer"><div><strong>SeatAI</strong><p>{t('onboarding.privacy')}</p></div><img src="/brand/vasia-dev-signature.png" width={373} height={259} alt="vasia dev." loading="lazy" /></footer>
  </div>;
}
