import { describe, it, expect } from 'vitest';
import { buildHandoutHtml } from './printHandout';
import type { Student } from '../../types';

function makeStudent(id: string, name: string): Student {
  return {
    id,
    name,
    gender: 'male',
    age: 10,
    academic_level: 'proficient',
    academic_score: 80,
    behavior_level: 'good',
    behavior_score: 80,
    friends_ids: [],
    incompatible_ids: [],
    special_needs: [],
    requires_front_row: false,
    requires_quiet_area: false,
    has_mobility_issues: false,
    primary_language: 'English',
    is_bilingual: false,
  };
}

// Identity translator: returns the key so we can assert which strings render.
const t = (key: string) => key;

const base = {
  maxSeatmates: 3,
  isRTL: false,
  lang: 'en',
  fontFamily: 'sans-serif',
  t,
};

const students = [makeStudent('s1', 'Alice'), makeStudent('s2', 'Bob')];

describe('buildHandoutHtml', () => {
  it('includes peer + mentor questions and the roster when peers are on', () => {
    const html = buildHandoutHtml(students, { ...base, peersOn: true });
    expect(html).toContain('questionnaire.q_seatmates');
    expect(html).toContain('questionnaire.q_helper');
    expect(html).toContain('questionnaire.handout_roster');
    expect(html).toContain('Alice');
    expect(html).toContain('Bob');
  });

  it('omits peer + mentor questions and the roster when peers are off', () => {
    const html = buildHandoutHtml(students, { ...base, peersOn: false });
    expect(html).not.toContain('questionnaire.q_seatmates');
    expect(html).not.toContain('questionnaire.q_helper');
    expect(html).not.toContain('questionnaire.handout_roster');
    // Non-peer questions still render.
    expect(html).toContain('questionnaire.q_focus');
    expect(html).toContain('questionnaire.q_noise');
    // Dropped in the evidence-based redesign — no window/board items.
    expect(html).not.toContain('questionnaire.q_window');
    expect(html).not.toContain('questionnaire.q_board');
  });

  it('renders the 5-point noise scale (GSQ-P) rather than yes/somewhat/no', () => {
    const html = buildHandoutHtml(students, { ...base, peersOn: false });
    for (const n of [1, 2, 3, 4, 5]) {
      expect(html).toContain(`questionnaire.noise_${n}`);
    }
    expect(html).not.toContain('questionnaire.noise_yes');
  });

  it('renders the added belonging / learning-style / teacher-attention items', () => {
    const html = buildHandoutHtml(students, { ...base, peersOn: false });
    // B5 — sense of belonging (PSSM).
    expect(html).toContain('questionnaire.q_belonging');
    for (const n of [1, 2, 3, 4, 5]) expect(html).toContain(`questionnaire.belonging_${n}`);
    // B6 — learning-style preference (Cooperative Learning).
    expect(html).toContain('questionnaire.q_learning_style');
    for (const v of ['alone', 'pair', 'group']) expect(html).toContain(`questionnaire.learn_${v}`);
    // B7 — teacher-attention access (UDL Engagement).
    expect(html).toContain('questionnaire.q_teacher_attention');
    for (const n of [1, 2, 3, 4, 5]) expect(html).toContain(`questionnaire.attention_${n}`);
  });

  it('renders one blank line per allowed seatmate', () => {
    const html = buildHandoutHtml(students, { ...base, peersOn: true, maxSeatmates: 3 });
    expect(html.match(/class="blank"/g)?.length).toBe(3 + 1); // 3 seatmates + 1 helper
  });

  it('escapes HTML in student names', () => {
    const html = buildHandoutHtml([makeStudent('x', 'A & <b>')], { ...base, peersOn: true });
    expect(html).toContain('A &amp; &lt;b&gt;');
    expect(html).not.toContain('<b>');
  });

  it('sets document direction for RTL languages', () => {
    expect(buildHandoutHtml(students, { ...base, peersOn: true, isRTL: true, lang: 'ar' })).toContain('dir="rtl"');
    expect(buildHandoutHtml(students, { ...base, peersOn: true })).toContain('dir="ltr"');
  });

  it('embeds an auto-print trigger', () => {
    expect(buildHandoutHtml(students, { ...base, peersOn: true })).toContain('window.print()');
  });
});
