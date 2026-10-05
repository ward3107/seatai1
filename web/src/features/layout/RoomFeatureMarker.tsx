import { Columns2, DoorOpen, User } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { RoomFeature } from '../../core/layouts';
import { featurePosition, featureWall, type RoomGeometry } from './roomGeometry';
import { useLanguage } from '../../hooks/useLanguage';

export default function RoomFeatureMarker({ feature, geometry, compact = false, selected = false, children }: {
  feature: RoomFeature; geometry: RoomGeometry; compact?: boolean; selected?: boolean; children?: React.ReactNode;
}) {
  const { t } = useLanguage();
  const position = featurePosition(feature.kind, feature.x, feature.y, geometry);
  const Icon = feature.kind === 'window' ? Columns2 : feature.kind === 'door' ? DoorOpen : User;
  const style: CSSProperties = { left: `${position.x * 100}%`, top: `${position.y * 100}%`, transform: 'translate(-50%, -50%)' };
  return <div data-room-feature={feature.id} data-feature-kind={feature.kind} data-wall={feature.kind === 'teacher' ? undefined : featureWall(position)}
    style={style} className={`absolute z-10 ${children ? '' : 'pointer-events-none'}`}>
    {children ?? <span role="img" aria-label={t(`roomPlan.${feature.kind}`)} dir="auto" className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium ${selected ? 'ring-2 ring-primary-500' : ''} ${feature.kind === 'teacher' ? 'w-32 min-h-10 bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200' : feature.kind === 'window' ? 'whitespace-nowrap bg-cyan-50 text-cyan-900 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-200' : 'whitespace-nowrap bg-violet-50 text-violet-900 border-violet-300 dark:bg-violet-950 dark:text-violet-200'}`}>
      <Icon size={16} aria-hidden="true" />{(!compact || feature.kind === 'teacher') && t(`roomPlan.${feature.kind}`)}
    </span>}
  </div>;
}
