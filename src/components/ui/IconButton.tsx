import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type IconButtonTone = "default" | "danger";
export type IconButtonSize = "sm" | "md";

const TONE: Record<IconButtonTone, string> = {
  default: "text-ink-3 hover:bg-hover hover:text-ink",
  danger: "text-ink-3 hover:bg-danger-soft hover:text-danger-ink",
};

const SIZE: Record<IconButtonSize, string> = {
  sm: "size-7 rounded-md [&_svg]:size-3.5",
  md: "size-9 rounded-md [&_svg]:size-4",
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: the button has no visible text, so this *is* its name. */
  label: string;
  tone?: IconButtonTone;
  size?: IconButtonSize;
  children: ReactNode;
}

/**
 * Row and toolbar actions. Resting state is muted rather than hidden — a
 * hover-only affordance is invisible to keyboard and touch, and a row of
 * things fading in under the cursor is noisier than a row of quiet glyphs.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, tone = "default", size = "md", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        "transition-[background-color,color,transform] duration-150 ease-out-quart",
        "active:scale-95 disabled:pointer-events-none disabled:opacity-35",
        SIZE[size],
        TONE[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
