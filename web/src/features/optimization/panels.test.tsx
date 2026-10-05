import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../../core/store';
import { ClassroomOptimizer } from '../../core/optimizer';
import { sampleStudents } from '../../utils/sampleData';
import MetricsPanel from './MetricsPanel';
import ExplanationPanel from '../results/ExplanationPanel';

beforeEach(() => {
  const initial = useStore.getInitialState();
  const students = sampleStudents.slice(0, 4);
  const layoutDef = { type: 'rows' as const, rows: 2, cols: 3 };
  const engine = new ClassroomOptimizer(students, layoutDef);
  engine.setConfig({ ...initial.config, populationSize: 10, maxGenerations: 5 });
  useStore.setState({ ...initial, students, layoutDef, rows: 2, cols: 3, uiLanguage: 'en', result: engine.optimize() });
});
describe('saved result compatibility', () => {
  it('renders metrics for a legacy result without warnings or a valid provenance date', () => {
    const result = { ...useStore.getState().result! };
    delete (result as Partial<typeof result>).warnings;
    if (result.provenance) result.provenance = { ...result.provenance, generatedAt: 'invalid-date' };
    useStore.setState({ result });
    expect(() => render(<MetricsPanel />)).not.toThrow();
    expect(screen.getByText('Behavioral Fit')).toBeInTheDocument();
  });
  it('renders explanations when optional legacy student arrays are absent', () => {
    const students = useStore.getState().students.map(student => {
      const copy = { ...student }; delete (copy as Partial<typeof copy>).special_needs;
      delete (copy as Partial<typeof copy>).friends_ids;
      delete (copy as Partial<typeof copy>).incompatible_ids; return copy;
    });
    useStore.setState({ students, viewMode: 'rows' });
    expect(() => render(<ExplanationPanel />)).not.toThrow();
    expect(screen.getByText('Why This Seating?')).toBeInTheDocument();
  });
  it('merges new constraint defaults into previously saved settings', () => {
    const current = useStore.getState();
    const merged = useStore.persist.getOptions().merge!({ constraints: { separate_pairs: [['s1', 's2']] } }, current);
    expect(merged.constraints.front_row_ids).toEqual(current.constraints.front_row_ids);
    expect(merged.constraints.keep_together_pairs).toEqual(current.constraints.keep_together_pairs);
    expect(merged.constraints.separate_pairs).toEqual([['s1', 's2']]);
  });
  it('persists the active seating chart alongside the roster', () => {
    const state = useStore.getState();
    const saved = useStore.persist.getOptions().partialize!(state) as { result: typeof state.result };
    expect(saved.result).toBe(state.result);
  });
});
