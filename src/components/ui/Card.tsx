import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The widget. Everything in Fluss that groups information is one of these:
 * a surface one step up from the sheet it sits on, a 16px radius, a hairline
 * to hold its edge, and generous padding.
 *
 * Cards never nest. If content inside a card needs its own container it gets
 * an inset well (`bg-inset`), which reads as recessed instead of stacked.
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Lifts on hover. Only for cards that are themselves a target. */
  interactive?: boolean;
  padded?: boolean;
  children?: ReactNode;
}

export function Card({
  interactive = false,
  padded = true,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-card shadow-card",
        padded && "p-5",
        interactive &&
          "transition-[background-color,border-color] duration-150 ease-out-quart hover:border-line-strong hover:bg-hover",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * A card's own header: title on the left, optional count/action on the right.
 * Kept as a primitive so every widget's first line has the same weight, size
 * and spacing — the thing that makes a screen of widgets read as one system.
 */
export function CardHeader({
  title,
  meta,
  actions,
  className,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-4", className)}>
      <div className="flex min-w-0 items-baseline gap-2.5">
        <h2 className="truncate text-md font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {meta && <span className="shrink-0 text-xs text-ink-3">{meta}</span>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}

/**
 * Recessed container for lists, code, paths, thumbnails — anything that should
 * read as content *inside* a widget rather than as another widget.
 */
export function Well({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-lg border border-line bg-inset", className)} {...rest}>
      {children}
    </div>
  );
}
