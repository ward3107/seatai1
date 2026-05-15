/**
 * Right-side drawer (bottom sheet on mobile) showing one student's
 * full profile + the AI's reasoning for their seat. Opens when the
 * teacher clicks a student in the grid, the 3D view, or the sidebar
 * student list. Closes on Escape or backdrop tap.
 *
 * The drawer is presentation-only — it reads from the store and from
 * `explainPlacement()` and renders. No mutations.
 */

import { useEffect, useState } from 'react';
import {
  X,
  Heart,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Accessibility,
  Eye,
  Sparkles,
  Users,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Shuffle,
  Languages,
  Activity,
  BookOpen,
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import {
  explainPlacement,
  type ExplanationLine,
  type NeighborBreakdown,
} from '../../utils/explainPlacement';
import { aiExplainPlacement } from '../../utils/aiExplain';

const TONE_STYLES: Record<ExplanationLine['tone'], string> = {
  positive: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  neutral: 'bg-gray-50 border-gray-200 text-gray-700',
  caution: 'bg-amber-50 border-amber-200 text-amber-900',
  negative: 'bg-red-50 border-red-200 text-red-900',
};

const RELATION_BADGE: Record<NeighborBreakdown['relation'], { cls: string; key: string }> = {
  friend: { cls: 'bg-pink-100 text-pink-800', key: 'detail.relation_friend' },
  incompatible: { cls: 'bg-red-100 text-red-800', key: 'detail.relation_incompatible' },
  mentor: { cls: 'bg-violet-100 text-violet-800', key: 'detail.relation_mentor' },
  mentee: { cls: 'bg-indigo-100 text-indigo-800', key: 'detail.relation_mentee' },
  neutral: { cls: 'bg-gray-100 text-gray-700', key: 'detail.relation_neutral' },
};

const CONFIDENCE_BADGE: Record<'high' | 'medium' | 'low', string> = {
  high: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-red-100 text-red-800',
};

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className="tabular-nums font-medium">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-400 to-accent-400"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Line({ line, t }: { line: ExplanationLine; t: (k: string, v?: Record<string, string | number>) => string }) {
  return (
    <li className={clsx('px-3 py-2 rounded-lg border text-sm leading-snug', TONE_STYLES[line.tone])}>
      {t(line.key, line.vars)}
    </li>
  );
}

export default function StudentDetailPanel() {
  const detailsTargetStudentId = useStore((s) => s.detailsTargetStudentId);
  const setDetailsTarget = useStore((s) => s.setDetailsTarget);
  const students = useStore((s) => s.students);
  const result = useStore((s) => s.result);
  const layoutDef = useStore((s) => s.layoutDef);
  const constraints = useStore((s) => s.constraints);
  const aiSettings = useStore((s) => s.aiSettings);
  const { t } = useLanguage();

  // AI-generated paragraph (one per student per drawer open). Lives
  // locally — never persisted. Clears when the drawer closes.
  const [aiText, setAiText] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>('');

  const open = !!detailsTargetStudentId;
  const student = open
    ? students.find((s) => s.id === detailsTargetStudentId) ?? null
    : null;

  // Close on Escape; also reset the AI text whenever the drawer closes
  // or the targeted student changes so the cached result doesn't bleed
  // across students.
  useEffect(() => {
    setAiText('');
    setAiError('');
    setAiLoading(false);
  }, [detailsTargetStudentId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailsTarget(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, setDetailsTarget]);

  if (!open || !student) return null;

  const explanation = result
    ? explainPlacement(student, result, layoutDef, students, constraints)
    : null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label={t('detail.close')}
        onClick={() => setDetailsTarget(null)}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
      />

      {/* Drawer — right side on md+, bottom sheet on mobile */}
      <aside
        className={clsx(
          'fixed z-50 bg-white shadow-2xl overflow-hidden flex flex-col',
          // Mobile (default): bottom sheet
          'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl',
          // md+: right-side drawer
          'md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:top-0 md:max-h-none md:w-[440px] md:max-w-[90vw] md:rounded-t-none md:rounded-l-2xl',
        )}
        aria-labelledby="student-detail-title"
        role="dialog"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt=""
                className="w-12 h-12 rounded-full object-cover shadow-sm flex-shrink-0 border border-white"
              />
            ) : (
              <div
                className={clsx(
                  'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0',
                  student.gender === 'male'
                    ? 'bg-blue-400'
                    : student.gender === 'female'
                      ? 'bg-pink-400'
                      : 'bg-purple-400',
                )}
              >
                {student.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2
                id="student-detail-title"
                className="font-bold text-gray-900 truncate"
              >
                {student.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                {explanation?.slot && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <MapPin size={11} />
                    {t('detail.row')} {explanation.slot.row + 1},{' '}
                    {t('detail.col')} {explanation.slot.col + 1}
                  </span>
                )}
                {explanation && (
                  <span
                    className={clsx(
                      'text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded',
                      CONFIDENCE_BADGE[explanation.confidence],
                    )}
                  >
                    {t(`detail.confidence_${explanation.confidence}`)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setDetailsTarget(null)}
            className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0"
            aria-label={t('detail.close')}
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 space-y-5">
          {/* AI summary — opt-in. Shows a button when not yet
              generated, a loading indicator while in flight, then the
              generated paragraph. Errors surface inline without
              breaking the rest of the drawer. */}
          {aiSettings.enabled && aiSettings.apiKey && explanation && (
            <section className="bg-gradient-to-br from-primary-50 to-accent-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-3 border border-primary-200 dark:border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wide">
                  {t('detail.ai_summary')}
                </span>
              </div>
              {aiText ? (
                <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {aiText}
                </p>
              ) : aiLoading ? (
                <p className="text-sm text-gray-500 italic">{t('detail.ai_loading')}</p>
              ) : aiError ? (
                <div>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-2">{aiError}</p>
                  <button
                    type="button"
                    onClick={() => { setAiError(''); setAiText(''); }}
                    className="text-xs text-primary-600 underline"
                  >
                    {t('detail.ai_try_again')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    if (!explanation) return;
                    setAiLoading(true);
                    setAiError('');
                    try {
                      const text = await aiExplainPlacement(
                        { apiKey: aiSettings.apiKey, model: aiSettings.model },
                        student,
                        explanation,
                      );
                      setAiText(text);
                    } catch (err) {
                      setAiError(err instanceof Error ? err.message : String(err));
                    } finally {
                      setAiLoading(false);
                    }
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-primary-300 dark:border-slate-600 rounded-lg text-xs font-medium text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('detail.ai_generate')}
                </button>
              )}
            </section>
          )}

          {/* Profile */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Activity size={12} /> {t('detail.profile')}
            </h3>
            <div className="space-y-2.5 bg-gray-50 rounded-xl p-3">
              <ScoreBar
                label={t('detail.academic')}
                value={student.academic_score}
              />
              <ScoreBar
                label={t('detail.behavior')}
                value={student.behavior_score}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-700">
                  {student.academic_level}
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-700">
                  {student.behavior_level}
                </span>
                {student.is_bilingual && (
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 inline-flex items-center gap-1">
                    <Languages size={9} /> {t('detail.bilingual')}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Teacher notes */}
          {student.notes && student.notes.trim().length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {t('detail.notes')}
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-amber-50 border border-amber-200 rounded-xl p-3">
                {student.notes}
              </p>
            </section>
          )}

          {/* Special needs */}
          {(student.special_needs.length > 0 ||
            student.has_mobility_issues ||
            student.requires_front_row ||
            student.requires_quiet_area) && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Heart size={12} /> {t('detail.special_needs')}
              </h3>
              <ul className="space-y-1.5">
                {student.has_mobility_issues && (
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <Accessibility size={14} className="text-blue-500" />
                    {t('detail.mobility')}
                  </li>
                )}
                {student.requires_front_row && (
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <ArrowUpRight size={14} className="text-amber-500" />
                    {t('detail.front_required')}
                  </li>
                )}
                {student.requires_quiet_area && (
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <Eye size={14} className="text-violet-500" />
                    {t('detail.quiet_area')}
                  </li>
                )}
                {student.special_needs.map((need, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <AlertCircle
                      size={14}
                      className="text-amber-500 mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <span className="font-medium">{need.type}</span>
                      {need.description && (
                        <span className="text-gray-500"> — {need.description}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* AI reasoning */}
          {explanation && (
            <>
              {/* Reasons */}
              {explanation.reasons.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Sparkles size={12} /> {t('detail.why_this_seat')}
                  </h3>
                  <ul className="space-y-1.5">
                    {explanation.reasons.map((r, i) => (
                      <Line key={i} line={r} t={t} />
                    ))}
                  </ul>
                </section>
              )}

              {/* Strengths */}
              {explanation.strengths.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-600" /> {t('detail.strengths')}
                  </h3>
                  <ul className="space-y-1.5">
                    {explanation.strengths.map((r, i) => (
                      <Line key={i} line={r} t={t} />
                    ))}
                  </ul>
                </section>
              )}

              {/* Weaknesses */}
              {explanation.weaknesses.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-amber-600" /> {t('detail.weaknesses')}
                  </h3>
                  <ul className="space-y-1.5">
                    {explanation.weaknesses.map((r, i) => (
                      <Line key={i} line={r} t={t} />
                    ))}
                  </ul>
                </section>
              )}

              {/* Neighbors */}
              {explanation.neighbors.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Users size={12} /> {t('detail.neighbors')}
                  </h3>
                  <ul className="space-y-2">
                    {explanation.neighbors.map((n) => {
                      const badge = RELATION_BADGE[n.relation];
                      return (
                        <li
                          key={n.student.id}
                          className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100"
                        >
                          {n.student.photo_url ? (
                            <img
                              src={n.student.photo_url}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white"
                            />
                          ) : (
                            <div
                              className={clsx(
                                'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0',
                                n.student.gender === 'male'
                                  ? 'bg-blue-400'
                                  : n.student.gender === 'female'
                                    ? 'bg-pink-400'
                                    : 'bg-purple-400',
                              )}
                            >
                              {n.student.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-800 truncate">
                                {n.student.name}
                              </span>
                              <span
                                className={clsx(
                                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                                  badge.cls,
                                )}
                              >
                                {t(badge.key)}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                <BookOpen size={9} /> Δ{n.academicDiff}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Shuffle size={9} /> Δ{n.behaviorDiff}
                              </span>
                              {n.sameGender ? (
                                <span className="inline-flex items-center gap-1 text-amber-600">
                                  <ArrowDownRight size={9} /> {t('detail.same_gender')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                  <ArrowUpRight size={9} /> {t('detail.mixed_gender')}
                                </span>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </>
          )}

          {!result && (
            <p className="text-sm text-gray-500 italic">
              {t('detail.no_result_yet')}
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
