import { useDownloadStore } from "@/stores/downloadStore";
import { useUiStore } from "@/stores/uiStore";
import { api } from "@/lib/api";

export type InterruptAction = "quit" | "reload";

function hasActiveDownloads() {
  return useDownloadStore
    .getState()
    .downloads.some((d) => d.status === "downloading" || d.status === "processing");
}

/**
 * Quitting and reloading both throw away the download UI while yt-dlp keeps
 * running underneath, so both confirm first when something is in flight.
 * Nothing active → no dialog, just go (PLAN §45).
 */
export function requestInterrupt(action: InterruptAction) {
  if (hasActiveDownloads()) {
    useUiStore.getState().setPendingInterrupt(action);
    return;
  }
  performInterrupt(action);
}

export function performInterrupt(action: InterruptAction) {
  useUiStore.getState().setPendingInterrupt(null);
  // Stop the engines first. A reload leaves the Rust registry intact but wipes
  // the store that knows about it — the downloads would run on invisibly, with
  // nothing able to cancel them or record where the files went.
  api.forceCancelAll();
  if (action === "quit") {
    api.windowClose();
  } else {
    window.location.reload();
  }
}
