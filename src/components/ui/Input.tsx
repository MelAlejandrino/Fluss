import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type InputSize = "md" | "lg";

const SIZE: Record<InputSize, string> = {
  md: "h-10 gap-2.5 text-base",
  lg: "h-13 gap-3 text-base",
};

/** A trailing control sits *inside* the shell, so the right edge tightens up
    to leave it an even margin instead of stacking two lots of padding. */
const PADDING: Record<InputSize, { plain: string; withTrailing: string }> = {
  md: { plain: "px-3.5", withTrailing: "pl-3.5 pr-1" },
  lg: { plain: "px-4", withTrailing: "pl-4 pr-1.5" },
};

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Leading glyph inside the field. Decorative — the label carries meaning. */
  icon?: ReactNode;
  /** Rendered flush to the right edge, inside the field's own focus ring. */
  trailing?: ReactNode;
  inputSize?: InputSize;
  invalid?: boolean;
  /** URLs and paths. Stops a pasted link from reflowing as it's typed over. */
  mono?: boolean;
  wrapperClassName?: string;
}

/**
 * Soft field. Focus is a ring on the *shell*, never a border-width change —
 * growing the border by a pixel resizes the control and nudges everything
 * beside it. The inner input suppresses its own outline so the shell owns
 * the single focus treatment.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    icon,
    trailing,
    inputSize = "md",
    invalid = false,
    mono = false,
    className,
    wrapperClassName,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <div
      className={cn(
        "flex items-center rounded-lg border bg-inset",
        "transition-[border-color,box-shadow,background-color] duration-150 ease-out-quart",
        "focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/20",
        invalid ? "border-danger/60" : "border-line hover:border-line-strong",
        disabled && "pointer-events-none opacity-50",
        SIZE[inputSize],
        trailing ? PADDING[inputSize].withTrailing : PADDING[inputSize].plain,
        wrapperClassName,
      )}
    >
      {icon && <span className="flex shrink-0 items-center text-ink-3 [&_svg]:size-4">{icon}</span>}
      <input
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-ink outline-none",
          "placeholder:text-ink-3",
          mono && "font-mono",
          className,
        )}
        {...rest}
      />
      {trailing && <span className="flex shrink-0 items-center">{trailing}</span>}
    </div>
  );
});
