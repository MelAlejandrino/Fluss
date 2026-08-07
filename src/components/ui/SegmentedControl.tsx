import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { INDICATOR } from "@/lib/motion";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  /** Unique per instance — namespaces the sliding indicator's layout animation. */
  name: string;
  /** Accessible name for the group. */
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  /** `radio` for exclusive settings, `tab` when the choice swaps a view. */
  itemRole?: "radio" | "tab";
  /** Fixed columns keep a wrapping set balanced; omit to size to content. */
  columns?: number;
  size?: "sm" | "md";
  className?: string;
}

const SIZE = {
  sm: "h-7 px-3 text-sm",
  md: "h-8 px-3.5 text-base",
} as const;

/**
 * One control for every exclusive choice in the app — format, quality, theme,
 * mode. The selected pill is a single shared element that slides between
 * options rather than a class that blinks on and off, so the change reads as
 * movement between two states instead of two unrelated repaints.
 */
export function SegmentedControl<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
  itemRole = "radio",
  columns,
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  const isTab = itemRole === "tab";

  return (
    <div
      role={isTab ? "tablist" : "radiogroup"}
      aria-label={label}
      className={cn(
        "rounded-lg border border-line bg-inset p-1",
        columns ? "grid gap-1" : "inline-flex gap-1",
        className,
      )}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role={itemRole}
            {...(isTab ? { "aria-selected": active } : { "aria-checked": active })}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative inline-flex items-center justify-center rounded-md",
              "transition-colors duration-150 ease-out-quart",
              "disabled:pointer-events-none disabled:opacity-35",
              SIZE[size],
              active ? "text-ink" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${name}`}
                aria-hidden="true"
                transition={INDICATOR}
                className="absolute inset-0 rounded-md border border-line bg-card shadow-card"
              />
            )}
            <span className={cn("relative truncate", active && "font-medium")}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
