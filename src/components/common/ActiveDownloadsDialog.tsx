import { useDownloadStore } from "@/stores/downloadStore";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import type { InterruptAction } from "@/lib/interrupt";

interface ActiveDownloadsDialogProps {
  action: InterruptAction;
  onClose: () => void;
  onConfirm: () => void;
}

// Quitting and reloading interrupt downloads the same way, so they share this
// dialog. The webview's own `beforeunload` prompt is Chromium chrome and looks
// wrong in a window with custom decorations (PLAN §33).
const COPY: Record<InterruptAction, { question: string; confirm: string }> = {
  quit: { question: "Are you sure you want to quit?", confirm: "Quit" },
  reload: { question: "Reloading will stop them. Continue?", confirm: "Reload" },
};

export function ActiveDownloadsDialog({
  action,
  onClose,
  onConfirm,
}: ActiveDownloadsDialogProps) {
  const downloads = useDownloadStore((s) => s.downloads);
  const active = downloads.filter(
    (d) => d.status === "downloading" || d.status === "processing",
  );
  useEscapeKey(onClose);

  if (active.length === 0) return null;

  const { question, confirm } = COPY[action];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-downloads-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg border border-outline-variant bg-surface-container-low p-6 shadow-lg"
      >
        <h2 id="active-downloads-title" className="text-lg font-semibold text-on-surface">
          Downloads are still active
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          There {active.length === 1 ? "is" : "are"} {active.length} active download
          {active.length > 1 ? "s" : ""}. {question}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            autoFocus
            className="rounded px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded bg-error px-4 py-2 text-sm font-medium text-on-error transition-colors hover:bg-error/90"
          >
            {confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
