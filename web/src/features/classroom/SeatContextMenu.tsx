import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

interface Props {
  /** Open state + anchor position; null renders nothing. */
  contextMenu: { x: number; y: number; seatKey: string } | null;
  lockedSeats: string[];
  /** Seat keys with a constraint violation. */
  violations: Set<string>;
  onToggleLock: (seatKey: string) => void;
  onClose: () => void;
}

/** Right-click / long-press menu for a seat: lock/unlock + violation note. */
export default function SeatContextMenu({
  contextMenu,
  lockedSeats,
  violations,
  onToggleLock,
  onClose,
}: Props) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {contextMenu && (
        <motion.div
          key="ctx"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1.5 min-w-[190px] max-w-[calc(100vw-1rem)]"
          // Clamp to the viewport so a long-press near a screen edge (common
          // on phones) doesn't open the menu off-screen.
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 120),
            left: Math.min(contextMenu.x, window.innerWidth - 206),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-sm text-start hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
            onClick={() => {
              onToggleLock(contextMenu.seatKey);
              onClose();
            }}
          >
            {lockedSeats.includes(contextMenu.seatKey) ? (
              <>🔓 <span>{t('classroom.unlock_seat')}</span></>
            ) : (
              <>🔒 <span>{t('classroom.lock_seat')}</span></>
            )}
          </button>
          {violations.has(contextMenu.seatKey) && (
            <div className="px-4 py-2 text-xs text-red-500 dark:text-red-400 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700 mt-1">
              <AlertTriangle size={12} />
              {t('classroom.constraint_violation')}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
