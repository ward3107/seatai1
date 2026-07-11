import clsx from 'clsx';
import {
  Undo2,
  Redo2,
  GripVertical,
  MousePointer2,
  Palette,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  AlignJustify,
  Columns2,
  History,
  ShieldCheck,
  Tags,
} from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import type { HeatMapMode } from '../../core/store';

function getHeatMapOptions(t: (key: string) => string): { value: HeatMapMode; label: string }[] {
  return [
    { value: 'none', label: t('gridControls.heatmap_default') },
    { value: 'academic', label: t('gridControls.heatmap_academic') },
    { value: 'behavior', label: t('gridControls.heatmap_behavior') },
    { value: 'gender', label: t('gridControls.heatmap_gender') },
    { value: 'conflicts', label: t('gridControls.heatmap_conflicts') },
  ];
}

interface Props {
  interactionMode: 'drag' | 'click';
  setInteractionMode: (mode: 'drag' | 'click') => void;
  showRelations: boolean;
  setShowRelations: (show: boolean) => void;
}

export default function GridControls({
  interactionMode,
  setInteractionMode,
  showRelations,
  setShowRelations,
}: Props) {
  const history = useStore((s) => s.history);
  const historyFuture = useStore((s) => s.historyFuture);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const heatMapMode = useStore((s) => s.heatMapMode);
  const setHeatMapMode = useStore((s) => s.setHeatMapMode);
  const zoomLevel = useStore((s) => s.zoomLevel);
  const setZoomLevel = useStore((s) => s.setZoomLevel);
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const showTimeline = useStore((s) => s.showTimeline);
  const setShowTimeline = useStore((s) => s.setShowTimeline);
  const showConstraintBadges = useStore((s) => s.showConstraintBadges);
  const setShowConstraintBadges = useStore((s) => s.setShowConstraintBadges);
  const showSeatTags = useStore((s) => s.showSeatTags);
  const setShowSeatTags = useStore((s) => s.setShowSeatTags);
  const { t } = useLanguage();
  const heatMapOptions = getHeatMapOptions(t);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-2 bg-gray-50 rounded-xl border border-gray-200">

      {/* ── Undo / Redo ── */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={undo}
          disabled={history.length === 0}
          aria-label={t('gridControls.undo')}
          title={t('gridControls.undo')}
          className={clsx(
            'p-2 rounded-lg transition-all flex items-center gap-1',
            history.length === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900'
          )}
        >
          <Undo2 size={15} aria-hidden="true" />
        </button>
        <button
          onClick={redo}
          disabled={historyFuture.length === 0}
          aria-label={t('gridControls.redo')}
          title={t('gridControls.redo')}
          className={clsx(
            'p-2 rounded-lg transition-all flex items-center gap-1',
            historyFuture.length === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900'
          )}
        >
          <Redo2 size={15} aria-hidden="true" />
        </button>
        {history.length > 0 && (
          <span className="text-[11px] text-gray-400 ml-1">
            {history.length}
          </span>
        )}
      </div>

      <div className="w-px h-5 bg-gray-300" />

      {/* ── Interaction Mode ── */}
      <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden bg-white">
        <button
          onClick={() => setInteractionMode('drag')}
          aria-pressed={interactionMode === 'drag'}
          title={t('gridControls.drag_mode')}
          className={clsx(
            'px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all',
            interactionMode === 'drag'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <GripVertical size={12} />
          {t('gridControls.drag')}
        </button>
        <button
          onClick={() => setInteractionMode('click')}
          aria-pressed={interactionMode === 'click'}
          title={t('gridControls.click_mode')}
          className={clsx(
            'px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all',
            interactionMode === 'click'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <MousePointer2 size={12} />
          {t('gridControls.click')}
        </button>
      </div>

      <div className="w-px h-5 bg-gray-300" />

      {/* ── Layout Mode ── */}
      <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden bg-white">
        <button
          onClick={() => setViewMode('rows')}
          aria-pressed={viewMode === 'rows'}
          title={t('gridControls.rows_layout')}
          className={clsx(
            'px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all',
            viewMode === 'rows'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <AlignJustify size={12} />
          {t('gridControls.rows')}
        </button>
        <button
          onClick={() => setViewMode('pairs')}
          aria-pressed={viewMode === 'pairs'}
          title={t('gridControls.pairs_layout')}
          className={clsx(
            'px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all',
            viewMode === 'pairs'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <Columns2 size={12} />
          {t('gridControls.pairs')}
        </button>
      </div>

      <div className="w-px h-5 bg-gray-300" />

      {/* ── Timeline ── */}
      <button
        onClick={() => setShowTimeline(!showTimeline)}
        aria-pressed={showTimeline}
        title={showTimeline ? t('gridControls.hide_timeline') : t('gridControls.show_timeline')}
        className={clsx(
          'p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium',
          showTimeline
            ? 'bg-orange-100 text-orange-600 border border-orange-200'
            : 'text-gray-500 hover:bg-white hover:shadow-sm'
        )}
      >
        <History size={15} />
        <span className="hidden sm:inline">{t('gridControls.timeline')}</span>
      </button>

      <div className="w-px h-5 bg-gray-300" />

      {/* ── Heat Map ── */}
      <div className="flex items-center gap-1.5">
        <Palette size={13} className="text-gray-400" />
        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden bg-white">
          {heatMapOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setHeatMapMode(opt.value)}
              aria-pressed={heatMapMode === opt.value}
              title={t('gridControls.color_by', { label: opt.label })}
              className={clsx(
                'px-2.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
                heatMapMode === opt.value
                  ? 'bg-indigo-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-px h-5 bg-gray-300" />

      {/* ── Zoom ── */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setZoomLevel(zoomLevel - 0.1)}
          disabled={zoomLevel <= 0.6}
          aria-label={t('gridControls.zoom_out')}
          title={t('gridControls.zoom_out')}
          className="p-2 rounded-lg text-gray-500 hover:bg-white hover:shadow-sm disabled:text-gray-300 disabled:cursor-not-allowed transition-all"
        >
          <ZoomOut size={15} />
        </button>
        <span className="text-xs text-gray-500 w-10 text-center font-mono tabular-nums">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={() => setZoomLevel(zoomLevel + 0.1)}
          disabled={zoomLevel >= 1.5}
          aria-label={t('gridControls.zoom_in')}
          title={t('gridControls.zoom_in')}
          className="p-2 rounded-lg text-gray-500 hover:bg-white hover:shadow-sm disabled:text-gray-300 disabled:cursor-not-allowed transition-all"
        >
          <ZoomIn size={15} />
        </button>
      </div>

      <div className="w-px h-5 bg-gray-300" />

      {/* ── Relationship Lines ── */}
      <button
        onClick={() => setShowRelations(!showRelations)}
        aria-pressed={showRelations}
        title={showRelations ? t('gridControls.hide_relations') : t('gridControls.show_relations')}
        className={clsx(
          'p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium',
          showRelations
            ? 'bg-indigo-100 text-indigo-600 border border-indigo-200'
            : 'text-gray-500 hover:bg-white hover:shadow-sm'
        )}
      >
        {showRelations ? <Eye size={15} /> : <EyeOff size={15} />}
        <span className="hidden sm:inline">{t('gridControls.relations')}</span>
      </button>

      {/* ── Constraint status badges ── */}
      <button
        onClick={() => setShowConstraintBadges(!showConstraintBadges)}
        title={showConstraintBadges ? t('gridControls.hide_badges') : t('gridControls.show_badges')}
        aria-pressed={showConstraintBadges}
        className={clsx(
          'p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium',
          showConstraintBadges
            ? 'bg-green-100 text-green-600 border border-green-200'
            : 'text-gray-500 hover:bg-white hover:shadow-sm'
        )}
      >
        <ShieldCheck size={15} />
        <span className="hidden sm:inline">{t('gridControls.badges')}</span>
      </button>

      {/* ── Per-seat data tags ── */}
      <button
        onClick={() => setShowSeatTags(!showSeatTags)}
        title={showSeatTags ? t('gridControls.hide_tags') : t('gridControls.show_tags')}
        aria-pressed={showSeatTags}
        className={clsx(
          'p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium',
          showSeatTags
            ? 'bg-indigo-100 text-indigo-600 border border-indigo-200'
            : 'text-gray-500 hover:bg-white hover:shadow-sm'
        )}
      >
        <Tags size={15} />
        <span className="hidden sm:inline">{t('gridControls.tags')}</span>
      </button>

    </div>
  );
}
