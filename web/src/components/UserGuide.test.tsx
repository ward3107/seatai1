import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import UserGuide from './UserGuide';

// Use the real locale strings — the modal is mostly translated content
// so a snapshot against pass-through keys would not catch much.
vi.mock('../hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => `[${key}]`,
  }),
}));

describe('UserGuide', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<UserGuide open={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('matches snapshot when open', () => {
    const { container } = render(<UserGuide open onClose={() => {}} />);
    // Trimmed snapshot — the structure (11 sections, ids, icons, the
    // privacy note we added) is the contract we're locking down.
    expect(container.firstChild).toMatchSnapshot();
  });

  it('includes all 11 documented section ids', () => {
    const { container } = render(<UserGuide open onClose={() => {}} />);
    const expected = [
      'getting_started', 'layouts', 'optimize', 'constraints',
      'editing', 'understanding', 'export',
      'personalize', 'ai', 'projects', 'accessibility',
    ];
    for (const id of expected) {
      expect(container.textContent).toContain(`[guide.section_${id}_title]`);
    }
  });
});
