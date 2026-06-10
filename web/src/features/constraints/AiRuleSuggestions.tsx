import { useState } from 'react';
import { Sparkles, Check, X, RefreshCw } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { aiSuggestRules, type RuleSuggestion } from '../../utils/aiSuggestRules';
import type { Student } from '../../types';

interface AiRuleSuggestionsProps {
  onApply: (s: RuleSuggestion) => void;
}

/**
 * "Suggest rules from notes" — sends students that have teacher notes to
 * the (opt-in) AI and shows each proposed rule as a chip the teacher must
 * explicitly accept. Nothing touches the constraints store until the
 * teacher clicks the checkmark.
 */
export default function AiRuleSuggestions({ onApply }: AiRuleSuggestionsProps) {
  const students = useStore((s) => s.students);
  const constraints = useStore((s) => s.constraints);
  const aiSettings = useStore((s) => s.aiSettings);
  const { t } = useLanguage();

  const [suggestions, setSuggestions] = useState<RuleSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasNotes = students.some((s) => s.notes && s.notes.trim().length > 0);
  if (!aiSettings.enabled || !aiSettings.apiKey || !hasNotes) return null;

  const nameOf = (id: string) => students.find((s: Student) => s.id === id)?.name ?? id;

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const out = await aiSuggestRules(
        { apiKey: aiSettings.apiKey, model: aiSettings.model },
        students,
        constraints,
      );
      setSuggestions(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setLoading(false);
    }
  };

  const accept = (s: RuleSuggestion) => {
    onApply(s);
    setSuggestions((prev) => (prev ? prev.filter((x) => x !== s) : prev));
  };
  const dismiss = (s: RuleSuggestion) => {
    setSuggestions((prev) => (prev ? prev.filter((x) => x !== s) : prev));
  };

  const kindLabel: Record<RuleSuggestion['kind'], string> = {
    separate: t('constraints.ai_kind_separate'),
    keep_together: t('constraints.ai_kind_together'),
    front_row: t('constraints.ai_kind_front'),
  };

  return (
    <section className="rounded-lg border bg-violet-50/40 border-violet-100 p-3 space-y-2">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-500" aria-hidden="true" />
          <h4 className="text-xs font-semibold text-gray-800">{t('constraints.ai_title')}</h4>
        </div>
        <button
          type="button"
          onClick={fetchSuggestions}
          disabled={loading}
          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
        >
          {loading ? (
            <>
              <RefreshCw size={11} className="animate-spin" aria-hidden="true" />
              {t('students.ai_loading')}
            </>
          ) : (
            t(suggestions ? 'students.ai_try_again' : 'constraints.ai_suggest')
          )}
        </button>
      </header>
      <p className="text-[11px] text-gray-500 leading-snug">{t('constraints.ai_hint')}</p>

      {error && (
        <p role="alert" className="text-[11px] text-red-600">{error}</p>
      )}

      {suggestions && suggestions.length === 0 && !error && (
        <p className="text-[11px] text-gray-500 italic">{t('constraints.ai_none')}</p>
      )}

      {suggestions && suggestions.length > 0 && (
        <ul className="space-y-1.5" aria-label={t('constraints.ai_title')}>
          {suggestions.map((s) => (
            <li
              key={`${s.kind}|${s.a}|${s.b ?? ''}`}
              className="flex items-start gap-2 p-2 bg-white rounded border border-violet-100 text-[11px]"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-800">
                  {kindLabel[s.kind]}: {nameOf(s.a)}
                  {s.b ? ` ↔ ${nameOf(s.b)}` : ''}
                </span>
                {s.reason && <p className="text-gray-500 mt-0.5">{s.reason}</p>}
              </div>
              <button
                type="button"
                onClick={() => accept(s)}
                className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                aria-label={t('constraints.ai_accept')}
                title={t('constraints.ai_accept')}
              >
                <Check size={12} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => dismiss(s)}
                className="p-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                aria-label={t('constraints.ai_dismiss')}
                title={t('constraints.ai_dismiss')}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
