import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DURATION, EASE } from "@/lib/motion";

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Page-level action or view switch, aligned to the title's baseline block. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Every page opens the same way: one h1, one line of orientation, and the
 * page's own control on the right. Identical type, spacing and rhythm across
 * all four screens — the thing that makes them feel like one product rather
 * than four layouts.
 *
 * The h1 is the only heading a page renders before its content, so the
 * document outline stays honest.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.slow, ease: EASE }}
      className={cn("mb-8 flex items-start justify-between gap-8", className)}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="text-balance text-2xl font-semibold tracking-[-0.022em] text-ink">
          {title}
        </h1>
        {description && <p className="max-w-[60ch] text-base text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 pt-1">{actions}</div>}
    </motion.header>
  );
}
