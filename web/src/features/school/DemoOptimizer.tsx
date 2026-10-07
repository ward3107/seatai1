import { useEffect, useRef, useState } from 'react';
import { SAMPLE_CLASSES } from '../../utils/sampleData';
import { useLanguage } from '../../hooks/useLanguage';
import { makeClassPublication } from './optimizationReport';
import type { SchoolCommand } from './types';

type Publication = Extract<SchoolCommand, { action: 'publish_class' }>['payload'];
export default function DemoOptimizer({ onResult }: { onResult: (data: Publication) => void }) {
  const { t } = useLanguage();
  const [size, setSize] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  async function optimize() {
    if (busy) return;
    const epoch = ++request.current;
    setBusy(true); setError(false); setProgress(0);
    try {
      const sample = SAMPLE_CLASSES.find(s => s.students.length === size)!;
      const { ClassroomOptimizer } = await import('../../core/optimizer');
      const layout = { type: 'rows' as const, rows: sample.rows, cols: sample.cols };
      const constraints = { separate_pairs: [], keep_together_pairs: [], front_row_ids: [], back_row_ids: [] };
      const engine = new ClassroomOptimizer(sample.students, layout);
      engine.setConfig({ populationSize: 70, maxGenerations: 100, crossoverRate: .8, mutationRate: .2, tournamentSize: 3, earlyStopPatience: 20, seed: size, timeLimitMs: 5000 });
      const result = await engine.optimizeAsync({ shouldStop: () => request.current !== epoch, onProgress: p => { if (epoch === request.current) setProgress(Math.round(100 * p.generation / Math.max(1, p.totalGenerations))); } });
      if (request.current === epoch) onResult(makeClassPublication(`${t('school.sampleClass')} · ${size}`, sample.students, result, layout, constraints));
    } catch { if (request.current === epoch) setError(true); }
    finally { if (request.current === epoch) setBusy(false); }
  }
  return <section className="school-demo-lab" aria-label={t('school.demoOptimizer')}>
    <div><h2>{t('school.demoOptimizer')}</h2><p>{t('school.demoOptimizerHint')}</p></div>
    <div className="school-demo-controls"><div className="school-sample-sizes" role="group" aria-label={t('school.sampleSize')}>{[15, 30, 45].map(count => <button type="button" key={count} aria-pressed={size === count} disabled={busy} onClick={() => setSize(count)}>{count}<small>{t('school.students')}</small></button>)}</div><button className="school-button" type="button" disabled={busy} onClick={() => void optimize()}>{t(busy ? 'app.optimizing' : 'school.optimizeDemo')}</button></div>
    {busy && <p role="status">{t('app.optimizing')} {progress}%</p>}{error && <p role="alert">{t('workspace.engine_error')}</p>}
  </section>;
}
