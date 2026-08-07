import { cn } from "@/lib/cn";

export interface ProgressProps {
  /** 0–1. Ignored when `indeterminate`. */
  value?: number;
  indeterminate?: boolean;
  /** Accessible name — what is progressing. */
  label: string;
  className?: string;
}

/**
 * The one place accent green is unmissable, and the reason it's reserved:
 * from across the desk a green bar means "still running" and nothing else in
 * the window competes for that read.
 *
 * The track is a wash of ink rather than a surface token, so the bar keeps the
 * same contrast whether it's sitting on a card, a well, or the sheet itself.
 */
export function Progress({ value = 0, indeterminate = false, label, className }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, value * 100));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-valuenow={indeterminate ? undefined : Math.round(pct)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-ink/12", className)}
    >
      {indeterminate ? (
        <div
          data-indeterminate=""
          className="h-full w-1/3 rounded-full bg-accent animate-indeterminate"
        />
      ) : (
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-400 ease-out-quart"
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
