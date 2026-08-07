import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Label + optional hint above a control.
 *
 * Sentence-case, 13px, medium weight — deliberately not the tiny tracked
 * all-caps eyebrow. That treatment is used so reflexively it stops reading as
 * a label and starts reading as decoration, and at 11px with letter-spacing it
 * is the least legible text on the screen.
 */
export function Field({
  label,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col gap-0.5">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium leading-tight text-ink-2"
        >
          {label}
        </label>
        {hint && <p className="text-xs text-ink-3">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/**
 * Settings-style row: label and hint on the left, control hard right.
 * Sits inside a Card, separated from its siblings by a hairline.
 */
export function Row({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-6 py-3.5",
        "border-t border-line first:border-t-0 first:pt-0 last:pb-0",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-base font-medium text-ink">{label}</p>
        {hint && <p className="max-w-prose text-xs leading-relaxed text-ink-3">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}
