import { motion } from "motion/react";
import { House, ArrowDownToLine, Clock3, Settings, Plus, type LucideIcon } from "lucide-react";
import { useUiStore, type Page } from "@/stores/uiStore";
import { useQueueCount } from "@/hooks/useQueueCount";
import { Tooltip } from "@/components/ui/Tooltip";
import { INDICATOR } from "@/lib/motion";
import { cn } from "@/lib/cn";

const NAV: { page: Page; label: string; icon: LucideIcon }[] = [
  { page: "home", label: "Home", icon: House },
  { page: "downloads", label: "Downloads", icon: ArrowDownToLine },
  { page: "history", label: "History", icon: Clock3 },
];

/**
 * A nav row. The selected state is a single pill that *slides* between rows
 * (shared layoutId) rather than a class toggling on two elements — the
 * movement is what tells you where you came from.
 *
 * Active is otherwise deliberately quiet: a lifted surface and a tinted icon.
 * No filled bar, no saturated background; you should be able to find your
 * place without the rail shouting about it.
 */
function NavItem({
  label,
  icon: Icon,
  active,
  badge,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <Tooltip label={label} bubbleClassName="lg:hidden" className="w-full">
      <button
        onClick={onClick}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex h-10 w-full items-center gap-3 rounded-lg text-base",
          "transition-colors duration-150 ease-out-quart",
          "max-lg:justify-center lg:px-3",
          active ? "text-ink" : "text-ink-2 hover:bg-hover hover:text-ink",
        )}
      >
        {active && (
          <motion.span
            layoutId="rail-selected"
            aria-hidden="true"
            transition={INDICATOR}
            className="absolute inset-0 rounded-lg border border-line bg-card shadow-card"
          />
        )}
        <Icon
          className={cn(
            "relative size-4.5 shrink-0 transition-colors duration-150",
            active ? "text-accent" : "text-ink-3 group-hover:text-ink-2",
          )}
          strokeWidth={1.75}
        />
        <span className="relative flex-1 truncate text-left font-medium max-lg:hidden">
          {label}
        </span>
        {badge !== undefined && badge > 0 && (
          <span
            className={cn(
              "relative shrink-0 rounded-full bg-accent-soft px-1.5 py-0.5",
              "font-mono text-2xs font-medium tabular-nums text-accent-ink",
              // Collapsed: the count won't fit, so it becomes a dot on the icon.
              "max-lg:absolute max-lg:right-1.5 max-lg:top-1.5 max-lg:size-2 max-lg:bg-accent max-lg:p-0 max-lg:text-transparent",
            )}
          >
            {badge}
          </span>
        )}
      </button>
    </Tooltip>
  );
}

/**
 * The navigation rail. It sits directly on the window background rather than
 * in a bordered column — the content sheet beside it is what's raised, so the
 * rail reads as part of the frame and the app has real depth without a single
 * heavy divider.
 *
 * Collapses to icons below `lg`; labels stay reachable as tooltips and
 * accessible names.
 */
export function Rail() {
  const page = useUiStore((s) => s.page);
  const navigate = useUiStore((s) => s.navigate);
  const newDownload = useUiStore((s) => s.newDownload);
  const queued = useQueueCount();

  return (
    <aside className="flex w-[76px] shrink-0 flex-col px-3 pb-3 lg:w-[236px]">
      <Tooltip label="New download" bubbleClassName="lg:hidden" className="mb-5 w-full">
        <button
          onClick={newDownload}
          aria-label="New download"
          aria-keyshortcuts="Control+N"
          className={cn(
            "flex h-10 w-full items-center gap-3 rounded-lg border border-line bg-card",
            "text-base font-medium text-ink shadow-card",
            "transition-[background-color,border-color,transform] duration-150 ease-out-quart",
            "hover:border-line-strong hover:bg-hover active:scale-[0.98]",
            "max-lg:justify-center lg:px-3",
          )}
        >
          <Plus className="size-4.5 shrink-0 text-accent" strokeWidth={2} />
          <span className="flex-1 text-left max-lg:hidden">New download</span>
          <kbd className="shrink-0 font-mono text-2xs text-ink-3 max-lg:hidden">Ctrl N</kbd>
        </button>
      </Tooltip>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
        {NAV.map(({ page: p, label, icon }) => (
          <NavItem
            key={p}
            label={label}
            icon={icon}
            active={page === p}
            badge={p === "downloads" ? queued : undefined}
            onClick={() => navigate(p)}
          />
        ))}
      </nav>

      <NavItem
        label="Settings"
        icon={Settings}
        active={page === "settings"}
        onClick={() => navigate("settings")}
      />
    </aside>
  );
}
