import { useDownloadStore } from "@/stores/downloadStore";

interface ConfirmQuitDialogProps {
  onClose: () => void;
  onQuit: () => void;
}

export function ConfirmQuitDialog({ onClose, onQuit }: ConfirmQuitDialogProps) {
  const downloads = useDownloadStore((s) => s.downloads);
  const active = downloads.filter(
    (d) => d.status === "downloading" || d.status === "processing",
  );

  if (active.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-outline-variant bg-surface-container-low p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-on-surface">
          Downloads are still active
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          There {active.length === 1 ? "is" : "are"} {active.length} active download
          {active.length > 1 ? "s" : ""}. Are you sure you want to quit?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            Cancel
          </button>
          <button
            onClick={onQuit}
            className="rounded bg-error px-4 py-2 text-sm font-medium text-on-error transition-colors hover:bg-error/90"
          >
            Quit
          </button>
        </div>
      </div>
    </div>
  );
}
