import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Filled buttons don't fade when disabled — a solid at 40% opacity is still
 * the brightest thing in the panel, which is exactly wrong for a control you
 * can't press. They drop to a neutral wash instead.
 */
const DISABLED_FILL = "disabled:bg-ink/8 disabled:text-ink-3 disabled:shadow-none";

/**
 * Four intents, and only four. `primary` is ink-filled rather than accent-
 * filled on purpose: green is reserved for state (progress, success), so a
 * button never competes with a running download for the eye.
 */
const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-solid text-on-solid shadow-card hover:bg-solid-hover " + DISABLED_FILL,
  secondary:
    "bg-card text-ink border border-line hover:bg-hover hover:border-line-strong disabled:opacity-45",
  ghost: "text-ink-2 hover:bg-hover hover:text-ink disabled:opacity-45",
  danger: "bg-danger-solid text-on-danger shadow-card hover:bg-danger-solid-hover " + DISABLED_FILL,
};

/** Heights are on the 8px rhythm; every size clears a 32px pointer target. */
const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-sm [&_svg]:size-3.5",
  md: "h-10 gap-2 rounded-lg px-4 [&_svg]:size-4",
  lg: "h-12 gap-2.5 rounded-lg px-5 [&_svg]:size-4",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Swaps the leading icon for a spinner and blocks input; label stays put. */
  loading?: boolean;
  /** Drops horizontal padding to square the control off for a lone icon. */
  iconOnly?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    iconOnly = false,
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap",
        "font-medium transition-[background-color,border-color,color,transform,opacity]",
        "duration-150 ease-out-quart",
        // Press: a 2% dip. Enough to feel mechanical, too small to look bouncy.
        "active:scale-[0.98]",
        "disabled:pointer-events-none",
        SIZE[size],
        iconOnly && (size === "sm" ? "w-8 px-0" : size === "md" ? "w-10 px-0" : "w-12 px-0"),
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner className={size === "sm" ? "size-3.5" : "size-4"} />}
      {children}
    </button>
  );
});
