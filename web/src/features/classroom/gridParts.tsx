import { useRef, useState, useLayoutEffect } from 'react';
import { RefreshCw, User, Ban } from 'lucide-react';
import clsx from 'clsx';
import type { Student } from '../../types';

/** Spinner shown while a lazily-loaded view (3D / timeline) fetches. */
export function LazyFallback() {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-gray-400 dark:text-gray-400">
      <RefreshCw size={16} className="animate-spin mr-2" />
      Loading…
    </div>
  );
}

/**
 * Scales its children so the seating grid always fits the available width,
 * then lets the user's manual zoom multiply on top. Crucially it also sizes
 * its own box to the *scaled* dimensions, so a shrunk grid no longer reserves
 * its full natural width — that's what stops the last column clipping / the
 * page scrolling sideways on phones.
 *
 * `zoom` is the user's manual zoom (1 = fit-to-width). Values > 1 intentionally
 * overflow into a scroll; values ≤ 1 shrink further.
 */
export function FitZoom({ zoom, children }: { zoom: number; children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [box, setBox] = useState<{ w?: number; h?: number }>({});

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      // scrollWidth/Height are layout sizes, unaffected by the CSS transform,
      // so reading them here never feeds back into the observed size.
      const natW = inner.scrollWidth;
      const natH = inner.scrollHeight;
      const availW = outer.clientWidth;
      if (!natW || !availW) return;
      // On phones we only ever shrink to fit (cap 1). On wider screens we let
      // the map grow a little to fill the available width — but only up to
      // 1.15×. The old 1.6× ballooned a small or half-empty class into giant
      // seats that felt clumsy on a desktop monitor.
      const maxUp = availW >= 700 ? 1.15 : 1;
      const fit = Math.min(maxUp, availW / natW);
      const s = fit * zoom;
      setScale(s);
      setBox({ w: natW * s, h: natH * s });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
    // Intentionally NOT depending on `children`: a parent re-render (e.g. on
    // every seat hover) passes a fresh `children` element, which would re-run
    // this effect — forcing a synchronous scrollWidth/Height reflow and
    // tearing down/recreating the ResizeObserver ~60× while sweeping the grid.
    // The observer already re-measures when the content's size actually changes,
    // so re-subscribing per render is pure waste.
  }, [zoom]);

  return (
    <div ref={outerRef} className="w-full flex justify-center overflow-x-auto">
      {/* The box reserves only the *scaled* footprint and clips the inner's
          (unscaled) layout overflow, so a shrunk grid neither scrolls nor
          clips real content. When the user zooms in past fit, box.w exceeds
          the container and the outer scrolls instead. */}
      <div style={{ width: box.w, height: box.h, overflow: 'hidden', position: 'relative' }}>
        <div
          ref={innerRef}
          style={{
            // Absolutely anchored to the physical top-left so the transform
            // origin is correct in both LTR and RTL (an inline-block would be
            // right-anchored under dir="rtl", breaking the scale origin).
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease',
            width: 'max-content',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Non-interactive tile for a teacher's desk / obstacle cell in the
 *  row-based renderer. Sized to sit alongside seat cards. */
export function DecoTile({ kind, label }: { kind: 'desk' | 'obstacle'; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={clsx(
        'rounded-lg min-h-[88px] w-[72px] flex flex-col items-center justify-center gap-1 border-2 select-none shrink-0',
        kind === 'desk'
          ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
          : 'bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400',
      )}
    >
      {kind === 'desk' ? <User size={18} aria-hidden="true" /> : <Ban size={18} aria-hidden="true" />}
      <span className="text-[10px] font-medium text-center leading-tight px-1">{label}</span>
    </div>
  );
}

/**
 * Card shown in the DragOverlay while a student is being dragged.
 * Each layout family keeps its own ghost styling: the absolute room uses a
 * solid colour card, the row grid uses the white tilted card.
 */
export function DragGhost({
  student,
  variant,
}: {
  student: Student;
  variant: 'absolute' | 'rows';
}) {
  if (variant === 'absolute') {
    return (
      <div
        className={clsx(
          'w-[88px] min-h-[88px] rounded-lg p-2 flex flex-col items-center justify-center text-white font-bold shadow-2xl scale-105',
          student.gender === 'male'
            ? 'bg-blue-400'
            : student.gender === 'female'
              ? 'bg-pink-400'
              : 'bg-purple-400',
        )}
      >
        <div className="text-xl">
          {student.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-xs mt-0.5 truncate w-full text-center">
          {student.name.split(' ')[0]}
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'w-[88px] h-[88px] rounded-lg border-2 border-indigo-400 bg-white dark:bg-gray-800 shadow-2xl',
        'flex flex-col items-center justify-center opacity-95 rotate-2 scale-110'
      )}
    >
      <div
        className={clsx(
          'w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm',
          student.gender === 'male'
            ? 'bg-blue-400'
            : student.gender === 'female'
            ? 'bg-pink-400'
            : 'bg-purple-400'
        )}
      >
        {student.name.charAt(0).toUpperCase()}
      </div>
      <p className="mt-1 text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[76px] text-center">
        {student.name.split(' ')[0]}
      </p>
    </div>
  );
}

/** Static colour legend shown when no heat-map mode is active. */
export function StaticLegend({ t }: { t: (key: string) => string }) {
  return (
    <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
      <div className="flex items-center gap-1.5">
        <div className="w-3.5 h-3.5 rounded bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800" />
        {t('classroom.legend_front_row')}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3.5 h-3.5 rounded-full bg-blue-400" />
        {t('classroom.legend_male')}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3.5 h-3.5 rounded-full bg-pink-400" />
        {t('classroom.legend_female')}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3.5 h-3.5 rounded bg-red-100 dark:bg-red-900/40 border-2 border-red-400" />
        {t('classroom.legend_violation')}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px]">🔒</span>
        {t('classroom.legend_locked')}
      </div>
    </div>
  );
}

/** Legend for the active heat-map mode (gender / conflicts / score ramp). */
export function HeatMapLegend({ mode, t }: { mode: string; t: (key: string) => string }) {
  if (mode === 'none') return null;

  const items =
    mode === 'gender'
      ? [
          { color: 'bg-blue-300', label: t('classroom.legend_male') },
          { color: 'bg-pink-300', label: t('classroom.legend_female') },
          { color: 'bg-purple-300', label: t('classroom.legend_other') },
        ]
      : mode === 'conflicts'
      ? [
          { color: 'bg-emerald-200', label: t('classroom.legend_no_violation') },
          { color: 'bg-red-200', label: t('classroom.legend_violation') },
        ]
      : [
          { color: 'bg-emerald-200', label: '85–100' },
          { color: 'bg-green-200', label: '70–84' },
          { color: 'bg-yellow-200', label: '55–69' },
          { color: 'bg-orange-200', label: '40–54' },
          { color: 'bg-red-200', label: '0–39' },
        ];

  return (
    <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={`w-3.5 h-3.5 rounded ${item.color} border border-gray-300 dark:border-gray-700`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
