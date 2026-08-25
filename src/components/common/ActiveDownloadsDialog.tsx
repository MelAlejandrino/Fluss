import { TriangleAlert } from "lucide-react";
import { useDownloadStore } from "@/stores/downloadStore";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
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

/**
 * The only modal in the app, and it exists because the alternative is losing
 * work silently. Cancel is focused on open and sits first: the safe choice
 * should be the one you get by pressing Enter or Escape without reading.
 */
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
    <Dialog
      title="Downloads are still active"
      titleId="active-downloads-title"
      icon={TriangleAlert}
      tone="danger"
      onClose={onClose}
      footer={
        <>
          {/* Secondary, not ghost: in a footer of exactly two choices both need
              to read as buttons. A ghost Cancel is bare text the moment focus
              moves off it, which is the wrong affordance for the safe option. */}
          <Button variant="secondary" autoFocus onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirm}
          </Button>
        </>
      }
    >
      There {active.length === 1 ? "is" : "are"} {active.length} active download
      {active.length > 1 ? "s" : ""}. {question}
      {/* The queue is written to disk, so this is an interruption rather than a
          loss — worth saying, because the dialog otherwise reads as a warning
          that everything waiting is about to be thrown away. */}
      <span className="mt-2 block text-ink-3">
        Anything unfinished will be waiting in the queue next time you open Fluss.
      </span>
    </Dialog>
  );
}
