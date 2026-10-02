import { useState } from 'react';
import { useStore } from '../../core/store';
import { generateSlots, type RoomFeature } from '../../core/layouts';
import { useLanguage } from '../../hooks/useLanguage';

/** Coordinates always describe the physical room, independent of text direction. */
export default function RoomPlan({ editable = false }: { editable?: boolean }) {
  const layout = useStore(s => s.layoutDef);
  const setLayout = useStore(s => s.setLayoutDef);
  const result = useStore(s => s.result);
  const students = useStore(s => s.students);
  const { t } = useLanguage();
  const [kind, setKind] = useState<RoomFeature['kind']>('door');
  const [selected, setSelected] = useState<string | null>(null);
  if (!editable && layout.roomFeatures === undefined) return null;
  const features = layout.roomFeatures ?? [];
  const slots = generateSlots(layout);
  const save = (next: RoomFeature[]) => setLayout({ ...layout, roomFeatures: next });
  const position = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!editable) return;
    const rect = event.currentTarget.getBoundingClientRect();
    let x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    let y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const current = features.find(f => f.id === selected);
    const type = current?.kind ?? kind;
    if (type !== 'teacher') {
      const distances = [x, 1 - x, y, 1 - y];
      const edge = distances.indexOf(Math.min(...distances));
      if (edge === 0) x = 0; else if (edge === 1) x = 1;
      else if (edge === 2) y = 0; else y = 1;
    }
    if (current) save(features.map(f => f.id === selected ? { ...f, x, y } : f));
    else {
      const feature = { id: crypto.randomUUID(), kind: type, x, y };
      save([...features.filter(f => type !== 'teacher' || f.kind !== 'teacher'), feature]);
      setSelected(feature.id);
    }
  };
  return <section className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 mb-4 text-sm" data-testid="room-plan">
    <h3 className="font-bold">{t('roomPlan.title')}</h3>
    {editable && <>
      <p className="text-xs my-2 text-gray-600 dark:text-gray-300">{t('roomPlan.instructions')}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {(['door', 'window', 'teacher'] as const).map(type => <button key={type} aria-pressed={!selected && kind === type}
          className="rounded-lg bg-white border px-3 py-2 text-gray-800" onClick={() => {
            setKind(type);
            const feature = { id: crypto.randomUUID(), kind: type, x: type === 'door' ? 1 : type === 'window' ? 0 : 0.5, y: type === 'teacher' ? 0.1 : 0.5 };
            save([...features.filter(f => type !== 'teacher' || f.kind !== 'teacher'), feature]);
            setSelected(feature.id);
          }}>
          + {t(`roomPlan.${type}`)}
        </button>)}
        {selected && <button className="rounded-lg border border-rose-200 px-3 py-2 text-rose-700" onClick={() => { save(features.filter(f => f.id !== selected)); setSelected(null); }}>{t('roomPlan.remove')}</button>}
        {layout.roomFeatures === undefined && <button className="underline" onClick={() => save([])}>{t('roomPlan.enable')}</button>}
      </div>
    </>}
    <p className="text-center text-xs mb-2">{t('roomPlan.front')}</p>
    <div dir="ltr" data-testid="room-plan-canvas" className="relative mx-4 my-5 h-64 border-2 border-sky-300 rounded bg-white dark:bg-gray-900" onClick={position}>
      {slots.map(slot => {
        const seat = result?.layout.seats.find(s => s.position.row === slot.row && s.position.col === slot.col);
        const name = students.find(s => s.id === seat?.student_id)?.name;
        return <span key={slot.index} title={name ?? `${slot.row + 1}, ${slot.col + 1}`} className="absolute text-[9px] text-center rounded bg-sky-100 text-sky-900 border border-sky-200 overflow-hidden pointer-events-none"
          style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%`, transform: 'translate(-50%, -50%)', maxWidth: 45 }}>{name ?? '○'}</span>;
      })}
      {features.map(feature => <button key={feature.id} type="button" disabled={!editable} aria-label={t(`roomPlan.${feature.kind}`)}
        onClick={event => { event.stopPropagation(); setSelected(feature.id); }}
        className={`absolute z-10 px-2 py-1 text-[10px] rounded border shadow-sm ${feature.kind === 'teacher' ? 'bg-amber-100 text-amber-900' : feature.kind === 'window' ? 'bg-cyan-100 text-cyan-900' : 'bg-violet-100 text-violet-900'} ${selected === feature.id ? 'ring-2 ring-primary-500' : ''}`}
        style={{ left: `${feature.x * 100}%`, top: `${feature.y * 100}%`, transform: 'translate(-50%, -50%)' }}>{t(`roomPlan.${feature.kind}`)}</button>)}
    </div>
    {editable && selected && <div className="flex gap-2 text-xs mb-2">
      {(['x', 'y'] as const).map(axis => <label key={axis}>{t(`roomPlan.${axis}`)}
        <input className="w-16 border rounded ms-1 p-1" type="number" min="0" max="100" value={Math.round((features.find(f => f.id === selected)?.[axis] ?? 0) * 100)}
          onChange={event => { const n = Number(event.target.value); if (Number.isFinite(n)) save(features.map(f => f.id === selected ? { ...f, [axis]: Math.max(0, Math.min(100, n)) / 100 } : f)); }} />
      </label>)}
    </div>}
    <p className="text-[11px] text-gray-600 dark:text-gray-300">{t('roomPlan.scope')}</p>
  </section>;
}
