import { useMemo, type ReactElement, type RefObject } from 'react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import type { Seat, Student, OptimizationResult } from '../../types';
import { roomGeometry } from '../layout/roomGeometry';
import RoomFeatureMarker from '../layout/RoomFeatureMarker';
import RelationshipOverlay from './RelationshipOverlay';
import { DecoTile, FitZoom } from './gridParts';

/** One exported floor plan contains the walls, features and interactive seats. */
export default function RoomLayoutRenderer({ seats, zoomLevel, gridContainerRef, renderSeatCard, showRelations, activeSeatKey, result, students }: {
  seats: Seat[]; zoomLevel: number; gridContainerRef: RefObject<HTMLDivElement>;
  renderSeatCard: (seat: Seat) => ReactElement; showRelations: boolean; activeSeatKey: string | null;
  result: OptimizationResult | null; students: Student[];
}) {
  const layout = useStore(s => s.layoutDef);
  const viewMode = useStore(s => s.viewMode);
  const { t } = useLanguage();
  const geometry = useMemo(() => roomGeometry(layout), [layout]);
  const byKey = new Map(geometry.seats.map(seat => [`${seat.row}-${seat.col}`, seat]));
  const pairs = viewMode === 'pairs' && (layout.type === 'rows' || layout.type === 'custom-rows');
  return <section data-testid="room-plan" aria-label={t('roomPlan.title')}>
    <p className="mb-3 text-center text-xs text-gray-500 dark:text-gray-400 sm:hidden">{t('workspace.pan_hint')}</p>
    <FitZoom zoom={zoomLevel}>
      <div ref={gridContainerRef} dir="ltr" id="seating-grid-export" className="relative p-14">
        <div dir="auto" className="absolute left-1/2 top-0 -translate-x-1/2 text-xs font-medium text-primary-800 dark:text-primary-200">{t('roomPlan.front')}</div>
        <div data-testid="room-seating-canvas"
          className="relative rounded-2xl border-2 border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-gray-900"
          style={{ width: geometry.width, height: geometry.height }}>
          {pairs && geometry.seats.filter(seat => seat.col % 2 === 0 && !(layout.blockedCells ?? []).some(cell => cell.row === seat.row)).map(seat => {
            const next = byKey.get(`${seat.row}-${seat.col + 1}`);
            return <div aria-hidden="true" key={`pair-${seat.index}`} className="absolute rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              style={{ left: seat.left - 50, top: seat.top - 68, width: next ? next.left - seat.left + 100 : 100, height: 136 }} />;
          })}
          {seats.map(seat => {
            const key = `${seat.position.row}-${seat.position.col}`;
            const point = byKey.get(key);
            if (!point) return null;
            return <div key={key} className="absolute" style={{ left: point.left, top: point.top, transform: 'translate(-50%, -50%)' }}>{renderSeatCard(seat)}</div>;
          })}
          {(layout.type === 'rows' || layout.type === 'custom-rows') && Array.from(new Map([...geometry.seats, ...geometry.decorations].map(point => [point.row, point.top]))).map(([row, top]) =>
            <span key={`row-${row}`} className="absolute left-5 -translate-y-1/2 text-xs font-medium text-gray-400" style={{ top }}>{row + 1}</span>)}
          {geometry.decorations.map(cell => {
            return <div key={`blocked-${cell.row}-${cell.col}`} className="absolute" style={{ left: cell.left, top: cell.top, transform: 'translate(-50%, -50%)' }}>
              <DecoTile kind={cell.kind} label={t(cell.kind === 'desk' ? 'layout.feature_desk' : 'layout.feature_obstacle')} />
            </div>;
          })}
          {(layout.roomFeatures ?? []).map(feature => <RoomFeatureMarker key={feature.id} feature={feature} geometry={geometry} />)}
        </div>
        {showRelations && <RelationshipOverlay activeSeatKey={activeSeatKey} result={result} students={students} containerRef={gridContainerRef} />}
      </div>
    </FitZoom>
  </section>;
}
