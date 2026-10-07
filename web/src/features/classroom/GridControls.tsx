import clsx from 'clsx';
import { Info, GripVertical, MousePointer2, ZoomIn, ZoomOut, AlignJustify, Columns2, SlidersHorizontal } from 'lucide-react';
import { useStore, type HeatMapMode } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';

interface Props {
  interactionMode: 'details' | 'drag' | 'click';
  setInteractionMode: (mode: 'details' | 'drag' | 'click') => void;
  showRelations: boolean;
  setShowRelations: (show: boolean) => void;
}

export default function GridControls({ interactionMode, setInteractionMode, showRelations, setShowRelations }: Props) {
  const heatMapMode = useStore(s => s.heatMapMode);
  const setHeatMapMode = useStore(s => s.setHeatMapMode);
  const zoomLevel = useStore(s => s.zoomLevel);
  const setZoomLevel = useStore(s => s.setZoomLevel);
  const viewMode = useStore(s => s.viewMode);
  const setViewMode = useStore(s => s.setViewMode);
  const showTimeline = useStore(s => s.showTimeline);
  const setShowTimeline = useStore(s => s.setShowTimeline);
  const showConstraintBadges = useStore(s => s.showConstraintBadges);
  const setShowConstraintBadges = useStore(s => s.setShowConstraintBadges);
  const showSeatTags = useStore(s => s.showSeatTags);
  const setShowSeatTags = useStore(s => s.setShowSeatTags);
  const { t } = useLanguage();
  const segment = (selected: boolean) => clsx('flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors', selected ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700');
  return (
    <div className="grid-controls mb-4 border-b border-gray-200 pb-3 dark:border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid-segments flex flex-wrap gap-2">
          <div className="grid-segment flex rounded-xl bg-gray-100 p-1 dark:bg-gray-900" role="group" aria-label={t('workspace.drag_handle')}>
            <button type="button" onClick={() => setInteractionMode('details')} aria-pressed={interactionMode === 'details'} className={segment(interactionMode === 'details')}><Info size={15} aria-hidden="true" />{t('workspace.details')}</button>
            <button type="button" onClick={() => setInteractionMode('drag')} aria-pressed={interactionMode === 'drag'} className={segment(interactionMode === 'drag')}><GripVertical size={15} />{t('gridControls.drag')}</button>
            <button type="button" onClick={() => setInteractionMode('click')} aria-pressed={interactionMode === 'click'} className={segment(interactionMode === 'click')}><MousePointer2 size={15} />{t('gridControls.click')}</button>
          </div>
          <div className="grid-segment flex rounded-xl bg-gray-100 p-1 dark:bg-gray-900">
            <button type="button" onClick={() => setViewMode('rows')} aria-pressed={viewMode === 'rows'} className={segment(viewMode === 'rows')}><AlignJustify size={15} />{t('gridControls.rows')}</button>
            <button type="button" onClick={() => setViewMode('pairs')} aria-pressed={viewMode === 'pairs'} className={segment(viewMode === 'pairs')}><Columns2 size={15} />{t('gridControls.pairs')}</button>
          </div>
        </div>
        <div className="grid-zoom flex items-center gap-1">
          <button type="button" onClick={() => setZoomLevel(zoomLevel - 0.1)} disabled={zoomLevel <= 0.6} aria-label={t('gridControls.zoom_out')} className="min-h-11 min-w-11 rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300"><ZoomOut size={18} /></button>
          <button type="button" onClick={() => setZoomLevel(1)} aria-label={t('quickGuide.reset_zoom')} className="min-h-11 w-14 text-center text-xs font-medium tabular-nums text-gray-600 dark:text-gray-300">{Math.round(zoomLevel * 100)}%</button>
          <button type="button" onClick={() => setZoomLevel(zoomLevel + 0.1)} disabled={zoomLevel >= 1.5} aria-label={t('gridControls.zoom_in')} className="min-h-11 min-w-11 rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300"><ZoomIn size={18} /></button>
        </div>
      </div>
      <details className="mt-2">
        <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-gray-500 dark:text-gray-300"><SlidersHorizontal size={15} />{t('workspace.view_options')}</summary>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-200">
          <label className="flex items-center gap-2">{t('gridControls.heatmap_default')}<select aria-label={t('gridControls.color_by', { label: '' })} value={heatMapMode} onChange={e => setHeatMapMode(e.target.value as HeatMapMode)} className="min-h-11 rounded-lg border border-gray-300 bg-white px-2 dark:border-gray-600 dark:bg-gray-800">
            {(['none', 'academic', 'behavior', 'gender', 'conflicts'] as const).map(mode => <option key={mode} value={mode}>{t(`gridControls.heatmap_${mode === 'none' ? 'default' : mode}`)}</option>)}
          </select></label>
          {[
            { value: showRelations, set: setShowRelations, label: 'relations' },
            { value: showConstraintBadges, set: setShowConstraintBadges, label: 'badges' },
            { value: showSeatTags, set: setShowSeatTags, label: 'tags' },
            { value: showTimeline, set: setShowTimeline, label: 'timeline' },
          ].map(item => <label key={item.label} className="flex min-h-11 cursor-pointer items-center gap-2"><input type="checkbox" checked={item.value} onChange={e => item.set(e.target.checked)} className="h-4 w-4 accent-teal-700" />{t(`gridControls.${item.label}`)}</label>)}
        </div>
      </details>
    </div>
  );
}
