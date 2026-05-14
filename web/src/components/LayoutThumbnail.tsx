import { generateSlots, type LayoutDef } from '../core/layouts';

/**
 * Tiny SVG preview of a layout's seat positions.
 *
 * Generated from the same `generateSlots` function that the optimizer and
 * the renderer use, so the preview is guaranteed to match the real shape —
 * there's no separate "thumbnail rules" file that could drift.
 */
export default function LayoutThumbnail({
  def,
  size = 56,
  active = false,
}: {
  def: LayoutDef;
  size?: number;
  active?: boolean;
}) {
  const slots = generateSlots(def);
  const fill = active ? '#7c3aed' : '#9ca3af';
  const teacherFill = active ? '#a78bfa' : '#d1d5db';

  // Pad inside the SVG so seats near the edge aren't clipped.
  const pad = 0.08;
  const map = (v: number) => pad + v * (1 - pad * 2);

  // Each seat is a small circle; the teacher marker is a wider rect at top.
  return (
    <svg
      viewBox="0 0 1 1"
      width={size}
      height={size}
      role="img"
      aria-hidden="true"
      className="block flex-shrink-0"
    >
      <rect
        x="0"
        y="0"
        width="1"
        height="1"
        rx="0.08"
        fill={active ? '#f5f3ff' : '#f9fafb'}
      />
      <rect
        x="0.35"
        y="0.02"
        width="0.3"
        height="0.06"
        rx="0.02"
        fill={teacherFill}
      />
      {slots.map((slot) => (
        <circle
          key={slot.index}
          cx={map(slot.x)}
          cy={map(slot.y) * 0.85 + 0.12} // shift down so seats don't overlap teacher
          r={0.035}
          fill={fill}
        />
      ))}
    </svg>
  );
}
