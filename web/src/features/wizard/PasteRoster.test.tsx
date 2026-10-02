import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PasteRoster from './PasteRoster';

const state = vi.hoisted(() => ({ students: [{ id: 'existing', name: 'Existing' }], setStudents: vi.fn() }));
vi.mock('../../core/store', () => ({
  useStore: Object.assign((selector: (s: typeof state) => unknown) => selector(state), { getState: () => state }),
}));
vi.mock('../../hooks/useLanguage', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));

beforeEach(() => vi.clearAllMocks());

describe('PasteRoster', () => {
  it('previews repeated names and appends distinct students without replacing the roster', () => {
    render(<PasteRoster />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'דנה\nדנה' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('pasteRoster.repeated')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'pasteRoster.add' }));
    const roster = state.setStudents.mock.calls[0][0];
    expect(roster).toHaveLength(3);
    expect(roster[0]).toBe(state.students[0]);
    expect(roster[1].name).toBe('דנה');
    expect(roster[1].id).not.toBe(roster[2].id);
    expect((input as HTMLTextAreaElement).value).toBe('');
    expect(screen.getByRole('status')).toHaveTextContent('pasteRoster.success');
    expect(screen.getByRole('button')).toBeDisabled();
  });
  it('prevents empty imports', () => {
    render(<PasteRoster />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' \n\t' } });
    expect(screen.getByRole('button')).toBeDisabled();
    expect(state.setStudents).not.toHaveBeenCalled();
  });
});
