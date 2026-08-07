import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** Say what will appear here and what puts it there — not "nothing found". */
  description?: string;
  /** The action that resolves the emptiness, when there is one. */
  action?: ReactNode;
  className?: string;
}

/**
 * Empty states teach the screen. The icon sits in its own soft plate rather
 * than floating grey on the background, and the copy names the next move —
 * these are the first thing a new user sees on three of the four pages.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-line",
        "bg-card/60 px-8 py-16 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-md font-semibold text-ink">{title}</h2>
        {description && (
          <p className="max-w-[38ch] text-balance text-base leading-relaxed text-ink-3">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
