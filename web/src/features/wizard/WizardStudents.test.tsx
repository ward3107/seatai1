import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import WizardStudents from './WizardStudents';

const state = vi.hoisted(() => ({
  students: [] as { id: string }[],
  setStudents: vi.fn(),
  setLayoutDef: vi.fn(),
  rtl: false,
}));
vi.mock('../../core/store', () => ({ useStore: (selector: (s: typeof state) => unknown) => selector(state) }));
vi.mock('../../hooks/useLanguage', () => ({ useLanguage: () => ({ t: (key: string) => key, isRTL: state.rtl }) }));
vi.mock('../students/StudentForm', () => ({ default: () => null }));
vi.mock('../students/StudentList', () => ({ default: () => null }));
vi.mock('../import/CsvImport', () => ({ default: () => null }));
vi.mock('../import/GoogleClassroomImport', () => ({ default: () => null }));
vi.mock('../import/OneRosterImport', () => ({ default: () => null }));
vi.mock('../../utils/sampleData', () => ({ SAMPLE_CLASSES: [{ id: 'test', students: [{ id: 'example' }], rows: 2, cols: 2 }] }));

beforeEach(() => { vi.clearAllMocks(); state.students = []; state.rtl = false; });
afterEach(() => vi.restoreAllMocks());

describe('WizardStudents', () => {
  it.each([false, true])('supports arrow navigation and panel labels (RTL=%s)', (rtl) => {
    state.rtl = rtl;
    render(<WizardStudents />);
    const manual = screen.getByRole('tab', { name: 'wizard.tab_manual' });
    fireEvent.keyDown(manual, { key: rtl ? 'ArrowLeft' : 'ArrowRight' });
    const csv = screen.getByRole('tab', { name: 'wizard.tab_csv' });
    expect(document.activeElement).toBe(csv);
    expect(csv).toHaveAttribute('aria-selected', 'true');
    expect(manual).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', csv.id);
    fireEvent.keyDown(csv, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'wizard.tab_sample' }));
    fireEvent.keyDown(screen.getByRole('tab', { name: 'wizard.tab_sample' }), { key: 'Home' });
    expect(document.activeElement).toBe(manual);
  });

  it.each([false, true])('honors sample replacement confirmation: %s', (confirmed) => {
    state.students = [{ id: 'existing' }];
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(confirmed);
    render(<WizardStudents />);
    fireEvent.click(screen.getByRole('tab', { name: 'wizard.tab_sample' }));
    fireEvent.click(screen.getByRole('button', { name: /onboarding.sample_test/ }));
    expect(confirm).toHaveBeenCalledWith('wizard.confirm_sample_replace');
    expect(state.setStudents).toHaveBeenCalledTimes(confirmed ? 1 : 0);
    expect(state.setLayoutDef).toHaveBeenCalledTimes(confirmed ? 1 : 0);
  });

  it('loads a sample into an empty class without confirmation', () => {
    const confirm = vi.spyOn(window, 'confirm');
    render(<WizardStudents />);
    fireEvent.click(screen.getByRole('tab', { name: 'wizard.tab_sample' }));
    fireEvent.click(screen.getByRole('button', { name: /onboarding.sample_test/ }));
    expect(confirm).not.toHaveBeenCalled();
    expect(state.setStudents).toHaveBeenCalledWith([{ id: 'example' }]);
  });
});
