import { describe, expect, it } from 'vitest';
import { ClassroomOptimizer } from '../../core/optimizer';
import { SAMPLE_CLASSES } from '../../utils/sampleData';
import { makeClassPublication } from './optimizationReport';

describe('Classroom optimization publication', () => {
  it('preserves the selected result and excludes individual assessment data', () => {
    const students = SAMPLE_CLASSES[0].students.map(s => ({ ...s, notes: 'PRIVATE NOTE', photo_url: 'PRIVATE PHOTO' }));
    const layout = { type: 'rows' as const, rows: 3, cols: 5 };
    const engine = new ClassroomOptimizer(students, layout);
    engine.setConfig({ populationSize: 15, maxGenerations: 4, earlyStopPatience: 2, tournamentSize: 3, crossoverRate: .8, mutationRate: .2, seed: 7 });
    const result = engine.optimize();
    const payload = makeClassPublication('Selected class', students, result, layout, { separate_pairs: [], keep_together_pairs: [], front_row_ids: [], back_row_ids: [] });
    expect(payload.snapshot.positions).toHaveLength(15);
    expect(payload.optimization?.objectives).toEqual(result.objective_scores);
    expect(payload.optimization?.seated).toBe(15);
    expect(payload.optimization?.missing).toBe(0);
    expect(Object.keys(payload.students[0]).sort()).toEqual(['localRef', 'name']);
    expect(JSON.stringify(payload)).not.toContain('PRIVATE');
    expect(JSON.stringify(payload)).not.toContain('academic_score');
  });
  it('does not invent a report for a class that has never been optimized', () => {
    const sample = SAMPLE_CLASSES[0];
    expect(makeClassPublication('New class', sample.students, null, { type: 'rows', rows: 3, cols: 5 }, { separate_pairs: [], keep_together_pairs: [], front_row_ids: [], back_row_ids: [] }).optimization).toBeNull();
    expect(SAMPLE_CLASSES.map(s => s.students.length)).toEqual([15, 30, 45]);
  });
});
