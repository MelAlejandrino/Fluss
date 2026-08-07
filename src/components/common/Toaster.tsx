import { AnimatePresence, motion } from "motion/react";
import { TriangleAlert, Check, Info, X } from "lucide-react";
import { useToastStore, type ToastTone } from "@/stores/toastStore";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { DURATION, EASE } from "@/lib/motion";

const ICON: Record<ToastTone, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "bg-ink/8 text-ink-2" },
  success: { icon: Check, className: "bg-accent-soft text-accent-ink" },
  error: { icon: TriangleAlert, className: "bg-danger-soft text-danger-ink" },
};

/**
 * Transient notices, bottom-right, out of the way of the content sheet.
 *
 * Toasts enter from below and leave sideways — different directions so a
 * dismissal never reads as another arrival. The stack itself is layout-
 * animated, so removing one slides the rest down rather than teleporting them.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[var(--z-toast)] flex w-full max-w-sm flex-col gap-2.5">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const { icon: Icon, className } = ICON[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.98 }}
              transition={{ duration: DURATION.slow, ease: EASE }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-panel p-3.5 shadow-pop"
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-md ${className}`}
              >
                <Icon className="size-4" strokeWidth={1.75} />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-1">
                <p className="text-base leading-snug text-ink">{t.message}</p>
                {t.actions && t.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {t.actions.map((a) => (
                      <Button
                        key={a.label}
                        size="sm"
                        variant={a.primary ? "primary" : "secondary"}
                        onClick={() => {
                          a.onClick?.();
                          dismiss(t.id);
                        }}
                      >
                        {a.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <IconButton label="Dismiss" size="sm" onClick={() => dismiss(t.id)} className="-mr-1">
                <X strokeWidth={1.75} />
              </IconButton>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
