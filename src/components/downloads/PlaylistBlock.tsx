import { ChevronDown, ListVideo } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The container a playlist's downloads live in, wherever they appear — queued,
 * finished, or in history.
 *
 * Thirty rows from one link is one thing you did, and it should read as one
 * thing: a labelled block with its own count and its own actions. The
 * alternative — thirty peers in a flat list — makes the playlist invisible
 * exactly when you need to act on it as a whole.
 */
export function PlaylistBlock({
  title,
  meta,
  actions,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  meta: string;
  actions?: ReactNode;
  /** Rows hidden behind the toggle. Omit for a block that's always open. */
  count?: number;
  expanded?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  const collapsible = count !== undefined && onToggle !== undefined;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-card">
      <div className="flex items-center gap-3.5 border-b border-line bg-inset px-4 py-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-ink">
          <ListVideo className="size-4" strokeWidth={1.75} />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-base font-medium text-ink">{title}</p>
          <p className="font-mono text-2xs tabular-nums text-ink-3">{meta}</p>
        </div>

        {actions}

        {collapsible && (
          // A disclosure, not a link: it says what it will show and which way
          // it currently sits, so the block can be skipped without opening it.
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-ink-3 transition-colors duration-150 hover:bg-hover hover:text-ink"
          >
            {expanded ? "Hide" : `Show ${count}`}
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-150 ease-out-quart",
                expanded && "rotate-180",
              )}
              strokeWidth={2}
            />
          </button>
        )}
      </div>

      {(!collapsible || expanded) && children}
    </div>
  );
}
