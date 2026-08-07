import { cn } from "@/lib/cn";

/**
 * Placeholder shaped like the thing that's coming. Used instead of a spinner
 * wherever a *region* is loading, so the layout is already correct when data
 * lands and nothing jumps.
 *
 * The travelling highlight lives in index.css (`.skeleton`) and flattens to a
 * static fill under prefers-reduced-motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton rounded-sm", className)} />;
}
