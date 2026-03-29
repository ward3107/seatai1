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
} from 'lucide-react';
import { useStore } from '../../core/store';
import type { HeatMapMode } from '../../core/store';

const HEAT_MAP_OPTIONS: { value: HeatMapMode; label: string }[] = [
  { value: 'none', label: 'Default' },
  { value: 'academic', label: 'Academic' },
  { value: 'behavior', label: 'Behavior' },
  { value: 'gender', label: 'Gender' },
  { value: 'conflicts', label: 'Conflicts' },
];

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
  const {
    history,
    historyFuture,
    undo,
    redo,
    heatMapMode,
    setHeatMapMode,
    zoomLevel,
    setZoomLevel,
    viewMode,
    setViewMode,
  } = useStore();

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-2 bg-gray-50 rounded-xl border border-gray-200">

      {/* ── Undo / Redo ── */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={undo}
          disabled={history.length === 0}
          title="Undo (Ctrl+Z)"
          className={clsx(
            'p-2 rounded-lg transition-all flex items-center gap-1',
            history.length === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900'
          )}
        >
          <Undo2 size={15} />
        </button>
        <button
          onClick={redo}
          disabled={historyFuture.length === 0}
          title="Redo (Ctrl+Y)"
          className={clsx(
            'p-2 rounded-lg transition-all flex items-center gap-1',
            historyFuture.length === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900'
          )}
        >
          <Redo2 size={15} />
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
          title="Drag & Drop mode"
          className={clsx(
            'px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all',
            interactionMode === 'drag'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <GripVertical size={12} />
          Drag
        </button>
        <button
          onClick={() => setInteractionMode('click')}
          title="Click to swap mode"
          className={clsx(
            'px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all',
            interactionMode === 'click'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <MousePointer2 size={12} />
          Click
        </button>
      </div>

      <div className="w-px h-5 bg-gray-300" />

      {/* ── Layout Mode ── */}
      <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden bg-white">
        <button
          onClick={() => setViewMode('rows')}
          title="Standard rows layout"
          className={clsx(
            'px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all',
            viewMode === 'rows'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <AlignJustify size={12} />
          Rows
        </button>
        <button
          onClick={() => setViewMode('pairs')}
          title="Paired desks layout"
          className={clsx(
            'px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all',
            viewMode === 'pairs'
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <Columns2 size={12} />
          Pairs
        </button>
      </div>

      <div className="w-px h-5 bg-gray-300" />

      {/* ── Heat Map ── */}
      <div className="flex items-center gap-1.5">
        <Palette size={13} className="text-gray-400" />
        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden bg-white">
          {HEAT_MAP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setHeatMapMode(opt.value)}
              title={`Color by ${opt.label}`}
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
          title="Zoom out"
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
          title="Zoom in"
          className="p-2 rounded-lg text-gray-500 hover:bg-white hover:shadow-sm disabled:text-gray-300 disabled:cursor-not-allowed transition-all"
        >
          <ZoomIn size={15} />
        </button>
      </div>

      <div className="w-px h-5 bg-gray-300" />

      {/* ── Relationship Lines ── */}
      <button
        onClick={() => setShowRelations(!showRelations)}
        title={showRelations ? 'Hide relationship lines' : 'Show friend & conflict lines on hover'}
        className={clsx(
          'p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium',
          showRelations
            ? 'bg-indigo-100 text-indigo-600 border border-indigo-200'
            : 'text-gray-500 hover:bg-white hover:shadow-sm'
        )}
      >
        {showRelations ? <Eye size={15} /> : <EyeOff size={15} />}
        <span className="hidden sm:inline">Relations</span>
      </button>

    </div>
  );
}
