import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, type LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  icon: LucideIcon;
  /** Open on first render. Sections default to collapsed to keep the sidebar
   *  scannable; the caller opens the one relevant to the current step. */
  defaultOpen?: boolean;
  /** Optional trailing element in the header (e.g. a count chip). */
  badge?: ReactNode;
  children: ReactNode;
}

/**
 * Collapsible sidebar section — a titled, icon-led card that expands to reveal
 * its content. Matches the existing ProjectManager card styling so the sidebar
 * reads as one consistent accordion.
 */
export default function SidebarSection({ title, icon: Icon, defaultOpen = false, badge, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={18} className="text-gray-500 dark:text-gray-400 shrink-0" aria-hidden="true" />
          <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp size={18} className="text-gray-500 dark:text-gray-400 shrink-0" /> : <ChevronDown size={18} className="text-gray-500 dark:text-gray-400 shrink-0" />}
      </button>
      {open && <div className="p-4 pt-0">{children}</div>}
    </div>
  );
}
