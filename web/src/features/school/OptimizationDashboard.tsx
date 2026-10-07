import { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { Panel } from './SchoolComponents';
import type { SchoolClass } from './types';

export function SeatingMap({ schoolClass }: { schoolClass: SchoolClass }) {
  const { t } = useLanguage();
  const positions = schoolClass.snapshot?.positions ?? [];
  const spatial = schoolClass.optimization?.layoutType !== 'rows' && positions.length > 0 && positions.every(p => p.x !== undefined && p.y !== undefined);
  if (!positions.length) return <p className="school-empty">{t('school.noSeating')}</p>;
  const cols = schoolClass.snapshot!.cols;
  return <div className="school-map-scroll" tabIndex={0} role="region" aria-label={t('school.seating')}>
    <div className="school-board">{t('school.classFront')}</div>
    <div className={spatial ? 'school-seat-map school-seat-map-spatial' : 'school-seat-map'} style={spatial ? {} : { gridTemplateColumns: `repeat(${cols}, minmax(66px, 1fr))`, minWidth: Math.min(cols * 78, 1200) }}>
      {positions.map(p => <div key={p.localRef} className="school-map-seat" style={spatial ? { left: `${8 + p.x! * 84}%`, top: `${8 + p.y! * 84}%` } : { gridRow: p.row + 1, gridColumn: p.col + 1 }}>
        <span className="school-seat-number">{p.row + 1}.{p.col + 1}</span><span>{schoolClass.students.find(s => s.localRef === p.localRef)?.name ?? t('school.student')}</span>
      </div>)}
    </div>
  </div>;
}

export function ClassOptimization({ schoolClass }: { schoolClass: SchoolClass }) {
  const { t, uiLanguage } = useLanguage();
  const report = schoolClass.optimization;
  const seated = new Set(schoolClass.snapshot?.positions.map(p => p.localRef));
  const unseated = schoolClass.students.filter(student => !seated.has(student.localRef));
  const metrics = ['academic_balance', 'behavioral_balance', 'diversity', 'special_needs'] as const;
  return <div className="school-analysis" data-testid="school-optimization-report">
    <div className="school-analysis-map"><h3>{t('school.seating')}</h3><SeatingMap schoolClass={schoolClass} />{unseated.length > 0 && <div className="mt-4 text-sm"><h3>{t('school.missing')}</h3><p className="leading-7">{unseated.map(s => s.name).join(' · ')}</p></div>}</div>
    <div className="school-analysis-data">
      {report ? <>
        <div className="school-result-heading"><div><p>{t('school.optimizationScore')}</p><strong>{report.score.toLocaleString(uiLanguage)}<small>/100</small></strong></div><div className="school-score-ring" style={{ '--score': `${100 * report.seated / Math.max(1, schoolClass.studentCount)}%` } as React.CSSProperties}><span>{report.seated}<small>{t('school.seated')}</small></span></div></div>
        <p className="school-score-caption">{t('school.scoreMeaning')}</p>
        <div className="school-objectives">{metrics.map(key => {
          const label = key === 'academic_balance' ? `optimization.${report.strategy === 'exam' ? 'academic_fit' : `academic_${report.strategy}`}` : `optimization.${key === 'behavioral_balance' ? 'behavioral_fit' : key}`;
          return <div key={key}><div className="school-bar-label"><span>{t(label)}</span><strong>{report.objectives[key].toFixed(1)}</strong></div><div className="school-bar" role="meter" aria-label={t(label)} aria-valuenow={report.objectives[key]} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${report.objectives[key]}%` }} /></div></div>;
        })}</div>
        <dl className="school-review-counts">{(['missing', 'needsAttention', 'requiredAttention'] as const).map(key => <div key={key}><dt>{t(`school.${key}`)}</dt><dd className={report[key] ? 'school-attention' : ''}>{report[key]}</dd></div>)}</dl>
        <p className="school-report-time">{t('school.runAt')}: {new Date(report.generatedAt).toLocaleString(uiLanguage)}</p>
      </> : <div className="school-empty"><h3>{t('school.reportMissing')}</h3><p>{t('school.reportMissingHint')}</p></div>}
    </div>
  </div>;
}

export default function OptimizationDashboard({ classes }: { classes: SchoolClass[] }) {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState('');
  const selected = classes.find(c => c.id === selectedId) ?? classes.find(c => c.optimization) ?? classes[0];
  if (!selected) return <Panel title={t('school.optimizationDashboard')} hint={t('school.connectClassHint')}><p className="school-empty">{t('school.emptyOptimization')}</p></Panel>;
  return <Panel title={t('school.optimizationDashboard')} hint={t('school.sharedReportHint')} action={<label className="school-report-select"><span>{t('school.class')}</span><select className="school-input" aria-label={t('school.reportClass')} value={selected.id} onChange={e => setSelectedId(e.target.value)}>{classes.map(c => <option key={c.id} value={c.id}>{c.name} · {c.studentCount}</option>)}</select></label>}>
    <ClassOptimization schoolClass={selected} />
    {classes.filter(c => c.optimization).length > 1 && <div className="school-comparison"><h3>{t('school.compareClasses')}</h3>{classes.filter(c => c.optimization).map(c => <button type="button" key={c.id} onClick={() => setSelectedId(c.id)} className="school-class-bar"><span>{c.name}</span><span className="school-bar"><span style={{ width: `${c.optimization!.score}%` }} /></span><strong>{c.optimization!.score}</strong></button>)}</div>}
  </Panel>;
}
