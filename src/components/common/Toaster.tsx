import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { useToastStore, type ToastTone } from "@/stores/toastStore";
import { EASE } from "@/lib/motion";

const ICON: Record<ToastTone, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "text-primary" },
  success: { icon: Check, className: "text-primary" },
  error: { icon: AlertTriangle, className: "text-error" },
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const { icon: Icon, className } = ICON[t.tone];
          return (
            <motion.div
              key={t.id}
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="pointer-events-auto flex items-start gap-3 rounded border border-outline-variant bg-surface-container-lowest px-4 py-3 shadow-sm"
            >
              <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} strokeWidth={1.5} />
              <p className="flex-1 text-sm text-on-surface">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="-mr-1 rounded p-0.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              >
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
