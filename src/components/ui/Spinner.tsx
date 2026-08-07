import { cn } from "@/lib/cn";

/**
 * The only spinner in the app, and it appears in exactly two situations:
 * inside a button that is working, and beside a one-line status. Anything
 * that fills a region uses <Skeleton /> instead — a spinner in the middle of
 * a page tells you nothing about what is arriving.
 *
 * Drawn from currentColor so it inherits whatever it sits inside.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full",
        "border-2 border-current border-t-transparent opacity-70",
        className,
      )}
    />
  );
}
