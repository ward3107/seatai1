import { useRef, useState, useLayoutEffect } from 'react';
import { RefreshCw, User, Ban } from 'lucide-react';
import clsx from 'clsx';

/** Spinner shown while a lazily-loaded view (3D / timeline) fetches. */
export function LazyFallback() {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-gray-400">
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
      const fit = Math.min(1, availW / natW);
      const s = fit * zoom;
      setScale(s);
      setBox({ w: natW * s, h: natH * s });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [zoom, children]);

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
          ? 'bg-amber-100 border-amber-300 text-amber-700'
          : 'bg-gray-100 border-gray-300 text-gray-500',
      )}
    >
      {kind === 'desk' ? <User size={18} aria-hidden="true" /> : <Ban size={18} aria-hidden="true" />}
      <span className="text-[10px] font-medium text-center leading-tight px-1">{label}</span>
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
    <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs text-gray-500">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={`w-3.5 h-3.5 rounded ${item.color} border border-gray-300`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
