import { useState } from 'react';
import {
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  RotateCcw,
  User,
  Ban,
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { slotCount, type LayoutDef, type CellKind } from '../../core/layouts';
import LayoutThumbnail from '../../components/LayoutThumbnail';

type LayoutType = LayoutDef['type'];

interface PresetInfo {
  type: LayoutType;
  i18nKey: string;
  descKey: string;
  /** Sample LayoutDef used to render the preview thumbnail. */
  preview: LayoutDef;
}

// Order matters — shown to users in this sequence. `preview` is fixed at a
// readable shape (5x6 / 4x4 / etc.) so the thumbnail reflects the layout's
// character regardless of the user's current rows/cols selection.
const PRESETS: PresetInfo[] = [
  {
    type: 'rows',
    i18nKey: 'layout.rows',
    descKey: 'layout.rows_desc',
    preview: { type: 'rows', rows: 4, cols: 5 },
  },
  {
    type: 'clusters',
    i18nKey: 'layout.clusters',
    descKey: 'layout.clusters_desc',
    preview: { type: 'clusters', rows: 4, cols: 4, clusterSize: 2 },
  },
  {
    type: 'u-shape',
    i18nKey: 'layout.u_shape',
    descKey: 'layout.u_shape_desc',
    preview: { type: 'u-shape', rows: 4, cols: 5 },
  },
  {
    type: 'circle',
    i18nKey: 'layout.circle',
    descKey: 'layout.circle_desc',
    preview: { type: 'circle', rows: 3, cols: 5 },
  },
  {
    type: 'custom-rows',
    i18nKey: 'layout.custom_rows',
    descKey: 'layout.custom_rows_desc',
    preview: {
      type: 'custom-rows',
      rows: 4,
      cols: 6,
      customRowSizes: [3, 5, 6, 4],
    },
  },
];

/** Number field flanked by big −/+ touch targets, so rows/cols are easy to
 *  change on a phone (the bare number-input spinners are too small to tap). */
function Stepper({
  value,
  min,
  max,
  onChange,
  decLabel,
  incLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  decLabel: string;
  incLabel: string;
}) {
  const btn =
    'w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 active:scale-95 transition';
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={decLabel}
        className={btn}
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full min-w-0 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm text-center tabular-nums dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={incLabel}
        className={btn}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function LayoutPanel() {
  const { layoutDef, setLayoutDef, students } = useStore();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const total = slotCount(layoutDef);
  const enough = total >= students.length;

  const setType = (type: LayoutType) => {
    if (type === 'custom-rows' && !layoutDef.customRowSizes) {
      // Seed customRowSizes from current rows/cols.
      setLayoutDef({
        ...layoutDef,
        type,
        customRowSizes: Array.from(
          { length: layoutDef.rows },
          () => layoutDef.cols,
        ),
      });
    } else {
      setLayoutDef({ ...layoutDef, type });
    }
  };

  const setRows = (rows: number) => {
    const clamped = Math.max(1, Math.min(20, rows));
    setLayoutDef({ ...layoutDef, rows: clamped });
  };

  const setCols = (cols: number) => {
    const clamped = Math.max(1, Math.min(20, cols));
    setLayoutDef({ ...layoutDef, cols: clamped });
  };

  const setClusterSize = (size: number) => {
    setLayoutDef({ ...layoutDef, clusterSize: Math.max(2, Math.min(4, size)) });
  };

  const updateCustomRow = (idx: number, value: number) => {
    const sizes = [...(layoutDef.customRowSizes ?? [])];
    sizes[idx] = Math.max(0, Math.min(20, value));
    setLayoutDef({ ...layoutDef, customRowSizes: sizes });
  };

  const addCustomRow = () => {
    const sizes = [...(layoutDef.customRowSizes ?? []), layoutDef.cols];
    setLayoutDef({ ...layoutDef, customRowSizes: sizes, rows: sizes.length });
  };

  const removeCustomRow = (idx: number) => {
    const sizes = (layoutDef.customRowSizes ?? []).filter((_, i) => i !== idx);
    if (sizes.length === 0) return;
    setLayoutDef({ ...layoutDef, customRowSizes: sizes, rows: sizes.length });
  };

  const resetCustomRows = () => {
    setLayoutDef({
      ...layoutDef,
      customRowSizes: Array.from({ length: layoutDef.rows }, () => layoutDef.cols),
    });
  };

  // ── Desk / obstacle editor (rows layout only) ──────────────────────────────
  const blocked = layoutDef.blockedCells ?? [];
  const kindAt = (r: number, c: number): CellKind | null =>
    blocked.find((b) => b.row === r && b.col === c)?.kind ?? null;

  // Each click advances seat → obstacle → desk → seat. Only one desk is
  // allowed, so promoting a cell to desk demotes any previous desk.
  const cycleCell = (r: number, c: number) => {
    const cur = kindAt(r, c);
    const next: CellKind | null =
      cur === null ? 'obstacle' : cur === 'obstacle' ? 'desk' : null;
    let cells = blocked.filter((b) => !(b.row === r && b.col === c));
    if (next === 'desk') cells = cells.filter((b) => b.kind !== 'desk');
    if (next) cells = [...cells, { row: r, col: c, kind: next }];
    setLayoutDef({ ...layoutDef, blockedCells: cells });
  };

  const clearFeatures = () =>
    setLayoutDef({ ...layoutDef, blockedCells: [] });

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="layout-panel-body"
        className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
      >
        <div className="flex items-center gap-2">
          <LayoutGrid size={18} className="text-gray-500 dark:text-gray-400" aria-hidden="true" />
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('layout.title')}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {total} {t('layout.seats')}
          </span>
          {!enough && (
            <span
              className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-full text-[10px]"
              title={t('layout.not_enough_seats')}
            >
              !
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp size={18} aria-hidden="true" />
        ) : (
          <ChevronDown size={18} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div id="layout-panel-body" className="p-4 pt-0 space-y-3">
          {/* Preset picker */}
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('layout.title')}>
            {PRESETS.map((p) => {
              const active = layoutDef.type === p.type;
              return (
                <button
                  key={p.type}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setType(p.type)}
                  className={clsx(
                    'flex items-start gap-2.5 p-2.5 rounded-lg border-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                    active
                      ? 'bg-primary-50 border-primary-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300',
                  )}
                >
                  <LayoutThumbnail def={p.preview} size={48} active={active} />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="text-xs font-medium text-gray-800 dark:text-gray-100 leading-tight">
                      {t(p.i18nKey)}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                      {t(p.descKey)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Grid dimensions — shown for layouts that use rows/cols as input */}
          {(layoutDef.type === 'rows' ||
            layoutDef.type === 'clusters' ||
            layoutDef.type === 'u-shape' ||
            layoutDef.type === 'circle') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  {t('settings.rows')}
                </label>
                <Stepper
                  value={layoutDef.rows}
                  min={1}
                  max={20}
                  onChange={setRows}
                  decLabel={t('layout.fewer_rows')}
                  incLabel={t('layout.more_rows')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  {t('settings.columns')}
                </label>
                <Stepper
                  value={layoutDef.cols}
                  min={1}
                  max={20}
                  onChange={setCols}
                  decLabel={t('layout.fewer_cols')}
                  incLabel={t('layout.more_cols')}
                />
              </div>
            </div>
          )}

          {/* Desk & obstacles — rows layout only (regular grid). */}
          {layoutDef.type === 'rows' && (
            <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {t('layout.features_title')}
                </span>
                {blocked.length > 0 && (
                  <button
                    type="button"
                    onClick={clearFeatures}
                    className="text-[11px] text-red-600 dark:text-red-300 hover:text-red-800 underline focus:outline-none focus:ring-1 focus:ring-red-500 rounded"
                  >
                    {t('layout.features_clear')}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
                {t('layout.features_hint')}
              </p>

              <div
                className="inline-grid gap-1 mx-auto"
                style={{ gridTemplateColumns: `repeat(${layoutDef.cols}, minmax(0, 1fr))` }}
                role="group"
                aria-label={t('layout.features_title')}
              >
                {Array.from({ length: layoutDef.rows }).map((_, r) =>
                  Array.from({ length: layoutDef.cols }).map((__, c) => {
                    const kind = kindAt(r, c);
                    const label =
                      kind === 'desk'
                        ? t('layout.feature_desk')
                        : kind === 'obstacle'
                          ? t('layout.feature_obstacle')
                          : t('layout.feature_seat');
                    return (
                      <button
                        key={`${r}-${c}`}
                        type="button"
                        onClick={() => cycleCell(r, c)}
                        aria-label={`${t('layout.row')} ${r + 1}, ${c + 1}: ${label}`}
                        title={label}
                        className={clsx(
                          'w-7 h-7 rounded flex items-center justify-center border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                          kind === 'desk'
                            ? 'bg-amber-400 border-amber-500 text-white'
                            : kind === 'obstacle'
                              ? 'bg-gray-400 border-gray-500 text-white'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-primary-400',
                        )}
                      >
                        {kind === 'desk' ? (
                          <User size={13} aria-hidden="true" />
                        ) : kind === 'obstacle' ? (
                          <Ban size={13} aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  }),
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700" />
                  {t('layout.feature_seat')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-amber-400 border border-amber-500" />
                  {t('layout.feature_desk')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-gray-400 border border-gray-500" />
                  {t('layout.feature_obstacle')}
                </span>
              </div>
            </div>
          )}

          {/* Cluster pod size */}
          {layoutDef.type === 'clusters' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                {t('layout.cluster_size')}
              </label>
              <div className="flex gap-1">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setClusterSize(n)}
                    aria-pressed={(layoutDef.clusterSize ?? 2) === n}
                    className={clsx(
                      'flex-1 py-1.5 text-xs font-medium rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                      (layoutDef.clusterSize ?? 2) === n
                        ? 'bg-primary-50 border-primary-400 text-primary-700'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400',
                    )}
                  >
                    {n}×{n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom row sizes */}
          {layoutDef.type === 'custom-rows' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {t('layout.seats_per_row')}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={resetCustomRows}
                    title={t('layout.reset_rows')}
                    aria-label={t('layout.reset_rows')}
                    className="p-1 rounded hover:bg-gray-200 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <RotateCcw size={12} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={addCustomRow}
                    aria-label={t('layout.add_row')}
                    className="p-1 rounded bg-gray-800 hover:bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <Plus size={12} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <ul className="space-y-1.5 max-h-44 overflow-auto pr-1">
                {(layoutDef.customRowSizes ?? []).map((size, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 w-12 tabular-nums">
                      {t('layout.row')} {idx + 1}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={size}
                      onChange={(e) =>
                        updateCustomRow(idx, Number(e.target.value))
                      }
                      className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomRow(idx)}
                      disabled={(layoutDef.customRowSizes ?? []).length <= 1}
                      aria-label={t('layout.remove_row')}
                      className="p-1 rounded hover:bg-gray-200 text-gray-500 dark:text-gray-400 disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <Minus size={12} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!enough && (
            <p
              className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded p-2"
              role="alert"
            >
              {t('layout.not_enough_seats_detail', {
                seats: total,
                students: students.length,
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
