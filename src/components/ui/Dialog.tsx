import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { popIn, scrim as scrimVariants } from "@/lib/motion";

export interface DialogProps {
  title: string;
  /** Stable id linking the heading to aria-labelledby. */
  titleId: string;
  onClose: () => void;
  /** Sits in a soft plate beside the title; sets the dialog's temperature. */
  icon?: LucideIcon;
  tone?: "neutral" | "danger";
  children?: ReactNode;
  /** Actions, right-aligned. Least destructive first, per platform convention. */
  footer?: ReactNode;
  className?: string;
}

const TONE = {
  neutral: "bg-accent-soft text-accent-ink",
  danger: "bg-danger-soft text-danger-ink",
} as const;

/**
 * Modal. Deliberately small — a dialog interrupts, so it earns its place only
 * when a decision genuinely blocks what happens next, and then it asks one
 * question and gets out of the way.
 *
 * Escape and focus are the caller's job (useEscapeKey + autoFocus on the
 * dismissive action), which keeps this a pure surface.
 */
export function Dialog({
  title,
  titleId,
  onClose,
  icon: Icon,
  tone = "neutral",
  children,
  footer,
  className,
}: DialogProps) {
  return (
    <div className="fixed inset-0 z-[var(--z-scrim)] flex items-center justify-center p-6">
      <motion.div
        variants={scrimVariants}
        initial="hidden"
        animate="show"
        onClick={onClose}
        className="absolute inset-0 bg-scrim backdrop-blur-[3px]"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        variants={popIn}
        initial="hidden"
        animate="show"
        className={cn(
          "relative z-[var(--z-modal)] w-full max-w-md",
          "rounded-2xl border border-line bg-panel p-6 shadow-modal",
          className,
        )}
      >
        <div className="flex gap-4">
          {Icon && (
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                TONE[tone],
              )}
            >
              <Icon className="size-5" strokeWidth={1.75} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-semibold tracking-[-0.015em] text-ink">
              {title}
            </h2>
            {children && <div className="mt-2 text-base leading-relaxed text-ink-2">{children}</div>}
          </div>
        </div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </motion.div>
    </div>
  );
}
