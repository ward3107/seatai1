import type { Student } from '../../types';

interface HandoutOptions {
  /** Whether the peer-nomination + mentor questions are included. */
  peersOn: boolean;
  maxSeatmates: number;
  isRTL: boolean;
  lang: string;
  fontFamily: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
}

const blankLine = '<div class="blank"></div>';
const checkbox = (label: string) => `<span class="opt"><span class="box"></span>${esc(label)}</span>`;

/** Build a self-contained, printable blank questionnaire (one per student). */
export function buildHandoutHtml(students: Student[], o: HandoutOptions): string {
  const { t, peersOn, maxSeatmates, isRTL, fontFamily } = o;

  const question = (title: string, hint: string, body: string) =>
    `<section class="q"><h2>${esc(title)}</h2>${hint ? `<p class="hint">${esc(hint)}</p>` : ''}${body}</section>`;

  const parts: string[] = [];

  if (peersOn) {
    parts.push(
      question(
        t('questionnaire.q_seatmates'),
        t('questionnaire.q_seatmates_hint', { max: maxSeatmates }),
        Array.from({ length: maxSeatmates }, () => blankLine).join(''),
      ),
    );
    parts.push(question(t('questionnaire.q_helper'), t('questionnaire.q_helper_hint'), blankLine));
  }

  // B3 — action-zone / front-preference (merges the old focus & "see the
  //   board" items; they collapsed onto the same construct anyway).
  parts.push(
    question(
      t('questionnaire.q_focus'),
      t('questionnaire.q_focus_hint'),
      `<div class="opts">${checkbox(t('questionnaire.focus_front'))}${checkbox(t('questionnaire.focus_middle'))}${checkbox(t('questionnaire.focus_back'))}</div>`,
    ),
  );
  // B4 — noise sensitivity, 5-point (GSQ-P Auditory subscale).
  parts.push(
    question(
      t('questionnaire.q_noise'),
      t('questionnaire.q_noise_scale'),
      `<div class="opts">${([1, 2, 3, 4, 5] as const).map((n) => checkbox(`${n} — ${t(`questionnaire.noise_${n}`)}`)).join('')}</div>`,
    ),
  );

  // Roster reference so students can spell classmates' names correctly.
  const roster =
    peersOn && students.length > 0
      ? `<section class="roster"><h2>${esc(t('questionnaire.handout_roster'))}</h2><p class="names">${students
          .map((s) => esc(s.name))
          .join(' &middot; ')}</p></section>`
      : '';

  return `<!doctype html>
<html lang="${esc(o.lang)}" dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8" />
<title>${esc(t('questionnaire.title'))}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: ${fontFamily}; color: #1f2937; margin: 0; padding: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .intro { color: #6b7280; font-size: 13px; margin: 0 0 20px; }
  .meta { display: flex; gap: 32px; margin-bottom: 24px; }
  .meta .field { flex: 1; }
  .meta .label { font-size: 12px; color: #6b7280; }
  .meta .rule { border-bottom: 1px solid #9ca3af; height: 22px; }
  .q { margin-bottom: 18px; page-break-inside: avoid; }
  .q h2 { font-size: 15px; margin: 0 0 6px; }
  .hint { font-size: 12px; color: #6b7280; margin: 0 0 8px; }
  .blank { border-bottom: 1px solid #9ca3af; height: 24px; margin-bottom: 8px; }
  .opts { display: flex; gap: 24px; flex-wrap: wrap; }
  .opt { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; }
  .box { display: inline-block; width: 16px; height: 16px; border: 1.5px solid #6b7280; border-radius: 3px; }
  .roster { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; page-break-inside: avoid; }
  .roster h2 { font-size: 13px; color: #6b7280; margin: 0 0 6px; }
  .names { font-size: 13px; line-height: 1.9; margin: 0; }
  .actions { margin-bottom: 20px; }
  button { font: inherit; padding: 8px 16px; border: 0; border-radius: 8px; background: #6366f1; color: #fff; cursor: pointer; }
  @media print { .actions { display: none; } @page { margin: 1.4cm; } }
</style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">${esc(t('questionnaire.print_btn'))}</button></div>
  <h1>${esc(t('questionnaire.title'))}</h1>
  <p class="intro">${esc(t('questionnaire.handout_instructions'))}</p>
  <div class="meta">
    <div class="field"><div class="label">${esc(t('questionnaire.handout_name'))}</div><div class="rule"></div></div>
    <div class="field"><div class="label">${esc(t('questionnaire.handout_date'))}</div><div class="rule"></div></div>
  </div>
  ${parts.join('')}
  ${roster}
  <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 250); });</script>
</body>
</html>`;
}

/**
 * Open the printable handout in a new tab and trigger the print dialog.
 * Returns false if the browser blocked the pop-up.
 */
export function printHandout(students: Student[], o: HandoutOptions): boolean {
  const html = buildHandoutHtml(students, o);
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
