import { useMemo, useRef, useState } from 'react';
import { Columns2, DoorOpen, User, Trash2 } from 'lucide-react';
import { useStore } from '../../core/store';
import type { RoomFeature } from '../../core/layouts';
import { useLanguage } from '../../hooks/useLanguage';
import RoomFeatureMarker from './RoomFeatureMarker';
import { featurePosition, featureWall, nextFeaturePosition, onWall, roomGeometry, teacherFits, wallPositionAvailable, type Wall } from './roomGeometry';

/** A miniature of the same room geometry used by the live seating chart. */
export default function RoomPlan({ editable = false }: { editable?: boolean }) {
  const layout = useStore(s => s.layoutDef);
  const setLayout = useStore(s => s.setLayoutDef);
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<RoomFeature | null>(null);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ feature: RoomFeature; x: number; y: number; moved: boolean } | null>(null);
  const geometry = useMemo(() => roomGeometry(layout), [layout]);
  const features = layout.roomFeatures ?? [];
  const current = features.find(f => f.id === selected);
  const shown = features.map(f => preview?.id === f.id ? preview : f);
  const save = (next: RoomFeature[]) => setLayout({ ...layout, roomFeatures: next });
  const move = (feature: RoomFeature, x: number, y: number) => {
    const position = featurePosition(feature.kind, x, y, geometry);
    if (feature.kind === 'teacher' ? !teacherFits(position, geometry) : !wallPositionAvailable(features, position, feature.id)) {
      setError(t(feature.kind === 'teacher' ? 'roomPlan.occupied' : 'roomPlan.overlap'));
      return false;
    }
    setError('');
    save(features.map(f => f.id === feature.id ? { ...f, ...position } : f));
    return true;
  };
  if (!editable && layout.roomFeatures === undefined) return null;
  return <section className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900/40" data-testid="room-plan-editor">
    <h3 className="font-bold">{t('roomPlan.title')}</h3>
    {editable && <>
      <p className="my-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300">{t('roomPlan.instructions')}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {(['door', 'window', 'teacher'] as const).map(kind => <button key={kind} type="button"
          className="min-h-11 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          onClick={() => {
            const position = nextFeaturePosition(kind, features, geometry);
            if (!position) { setError(t('roomPlan.no_space')); return; }
            const feature = { id: crypto.randomUUID(), kind, ...position };
            save([...features.filter(f => kind !== 'teacher' || f.kind !== 'teacher'), feature]);
            setSelected(feature.id); setError('');
          }}>+ {t(`roomPlan.${kind}`)}</button>)}
      </div>
    </>}
    <div className="px-5 py-6">
      <p className="mb-5 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400">{t('roomPlan.front')}</p>
      <div ref={canvasRef} dir="ltr" data-testid="room-plan-canvas" className="relative h-64 rounded-xl border-2 border-slate-300 bg-white dark:border-slate-600 dark:bg-gray-900"
        onClick={event => {
          if (!editable || !current) return;
          const rect = event.currentTarget.getBoundingClientRect();
          move(current, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
        }}>
        <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
          {geometry.seats.map(seat => <rect key={seat.index} data-room-preview-seat="" x={seat.left - 36} y={seat.top - 40} width={72} height={80} rx={12} className="fill-slate-100 stroke-slate-400 dark:fill-slate-800 dark:stroke-slate-500" strokeWidth={3} />)}
          {geometry.decorations.map(cell => <rect key={`${cell.row}-${cell.col}`} x={cell.left - 36} y={cell.top - 40} width={72} height={80} rx={12} className={cell.kind === 'desk' ? 'fill-amber-100 stroke-amber-400' : 'fill-gray-300 stroke-gray-500'} strokeWidth={3} />)}
        </svg>
        {shown.map(feature => {
          const Icon = feature.kind === 'window' ? Columns2 : feature.kind === 'door' ? DoorOpen : User;
          return <RoomFeatureMarker key={feature.id} feature={feature} geometry={geometry} compact>
            <button type="button" disabled={!editable} aria-label={t(`roomPlan.${feature.kind}`)} aria-pressed={selected === feature.id}
              title={t(`roomPlan.${feature.kind}`)} style={{ touchAction: 'none' }}
              onClick={event => { event.stopPropagation(); setSelected(feature.id); }}
              onPointerDown={event => {
                if (!editable) return;
                event.stopPropagation(); setSelected(feature.id); setError('');
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = { feature, x: event.clientX, y: event.clientY, moved: false };
              }}
              onPointerMove={event => {
                const drag = dragRef.current;
                if (!drag || drag.feature.id !== feature.id) return;
                if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4 && !drag.moved) return;
                drag.moved = true;
                const rect = canvasRef.current!.getBoundingClientRect();
                const point = featurePosition(feature.kind, drag.feature.x + (event.clientX - drag.x) / rect.width, drag.feature.y + (event.clientY - drag.y) / rect.height, geometry);
                setPreview({ ...feature, ...point });
              }}
              onPointerUp={event => {
                const drag = dragRef.current; dragRef.current = null;
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                if (drag?.moved && preview) move(drag.feature, preview.x, preview.y);
                setPreview(null);
              }}
              onPointerCancel={() => { dragRef.current = null; setPreview(null); }}
              onKeyDown={event => {
                if (!editable || !event.key.startsWith('Arrow')) return;
                event.preventDefault(); const step = event.shiftKey ? 0.01 : 0.05;
                if (feature.kind === 'teacher') move(feature, feature.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), feature.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0));
                else {
                  const wall = featureWall(feature);
                  const vertical = wall === 'left' || wall === 'right';
                  const delta = vertical ? (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0) : (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0);
                  const point = onWall(wall, (vertical ? feature.y : feature.x) + delta); move(feature, point.x, point.y);
                }
              }}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-xs">
              <span className={`flex min-h-7 min-w-7 items-center justify-center gap-1 rounded-lg border ${selected === feature.id ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900' : ''} ${feature.kind === 'teacher' ? 'bg-amber-50 px-2 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200' : feature.kind === 'window' ? 'bg-cyan-50 text-cyan-900 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-200' : 'bg-violet-50 text-violet-900 border-violet-300 dark:bg-violet-950 dark:text-violet-200'}`}><Icon size={18} aria-hidden="true" />{feature.kind === 'teacher' && t('roomPlan.teacher')}</span>
            </button>
          </RoomFeatureMarker>;
        })}
      </div>
    </div>
    {editable && current && <div className="mb-3 space-y-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold">{t(`roomPlan.${current.kind}`)}</p>
        <button type="button" aria-label={t('roomPlan.remove')} onClick={() => { save(features.filter(f => f.id !== current.id)); setSelected(null); setError(''); }} className="min-h-11 min-w-11 rounded-lg p-2 text-rose-700 dark:text-rose-300"><Trash2 size={16} /></button>
      </div>
      {current.kind !== 'teacher' && <label className="block text-xs">{t('roomPlan.wall')}
        <select value={featureWall(current)} onChange={event => { const point = onWall(event.target.value as Wall, 0.5); move(current, point.x, point.y); }} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-2 dark:border-gray-600 dark:bg-gray-900">
          {(['left', 'right', 'front', 'back'] as const).map(wall => <option key={wall} value={wall}>{t(`roomPlan.wall_${wall}`)}</option>)}
        </select>
      </label>}
      {(current.kind === 'teacher' ? ['x', 'y'] as const : [featureWall(current) === 'left' || featureWall(current) === 'right' ? 'y' : 'x'] as const).map(axis => <label key={axis} className="block text-xs">{t(`roomPlan.${axis}`)}
        <div className="mt-1 flex items-center gap-2"><input aria-label={t(`roomPlan.${axis}`)} className="h-11 min-w-0 flex-1 accent-teal-700" type="range" min={0} max={100} value={Math.round(current[axis] * 100)} onChange={event => move(current, axis === 'x' ? Number(event.target.value) / 100 : current.x, axis === 'y' ? Number(event.target.value) / 100 : current.y)} /><output className="w-10 text-end tabular-nums">{Math.round(current[axis] * 100)}%</output></div>
      </label>)}
    </div>}
    {error && <p role="alert" className="mb-2 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
    {editable && layout.roomFeatures === undefined && <button type="button" className="mb-3 min-h-11 text-xs underline" onClick={() => save([])}>{t('roomPlan.enable')}</button>}
    <details className="text-[11px] text-gray-600 dark:text-gray-300"><summary className="min-h-11 cursor-pointer py-3">{t('roomPlan.scope_title')}</summary><p className="leading-relaxed">{t('roomPlan.scope')}</p></details>
  </section>;
}
