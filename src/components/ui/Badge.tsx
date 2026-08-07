import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "danger" | "warn";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-ink/8 text-ink-2",
  accent: "bg-accent-soft text-accent-ink",
  danger: "bg-danger-soft text-danger-ink",
  warn: "bg-warn-soft text-warn-ink",
};

const DOT: Record<BadgeTone, string> = {
  neutral: "bg-ink-3",
  accent: "bg-accent",
  danger: "bg-danger",
  warn: "bg-warn",
};

export interface BadgeProps {
  tone?: BadgeTone;
  /** Leading state dot. Pair with text — never let colour carry meaning alone. */
  dot?: boolean;
  /** Byte counts, format names, counts: anything that shouldn't reflow. */
  mono?: boolean;
  className?: string;
  children: ReactNode;
}

/** Pill. Used for counts, formats, and status — small, quiet, never shouty. */
export function Badge({ tone = "neutral", dot = false, mono = false, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5",
        "text-2xs font-medium",
        mono && "font-mono tabular-nums",
        TONE[tone],
        className,
      )}
    >
      {dot && <span aria-hidden="true" className={cn("size-1.5 rounded-full", DOT[tone])} />}
      {children}
    </span>
  );
}
