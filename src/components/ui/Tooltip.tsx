import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Hover/focus label for controls whose text is hidden — the collapsed nav rail,
 * mostly. CSS-only and rendered beside the trigger rather than in a portal:
 * nothing in this app clips the rail, so there is no stacking context to escape
 * and no reason to pay for measurement on every hover.
 *
 * Marked aria-hidden because the trigger already carries the same string as its
 * accessible name; announcing it twice is noise.
 */
export function Tooltip({
  label,
  side = "right",
  children,
  className,
  bubbleClassName,
}: {
  label: string;
  side?: "right" | "bottom";
  children: ReactNode;
  className?: string;
  /** For conditioning the bubble on a breakpoint (e.g. `lg:hidden`). */
  bubbleClassName?: string;
}) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute z-[var(--z-tooltip)] whitespace-nowrap",
          "rounded-md border border-line bg-panel px-2.5 py-1.5 text-sm text-ink shadow-pop",
          "opacity-0 transition-[opacity,transform] duration-150 ease-out-quart",
          "group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          side === "right"
            ? "left-full top-1/2 ml-2.5 -translate-y-1/2 translate-x-1 group-hover/tt:translate-x-0 group-focus-within/tt:translate-x-0"
            : "left-1/2 top-full mt-2.5 -translate-x-1/2 -translate-y-1 group-hover/tt:translate-y-0 group-focus-within/tt:translate-y-0",
          bubbleClassName,
        )}
      >
        {label}
      </span>
    </span>
  );
}
