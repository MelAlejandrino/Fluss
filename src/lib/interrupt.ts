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
  void performInterrupt(action);
}

export async function performInterrupt(action: InterruptAction) {
  useUiStore.getState().setPendingInterrupt(null);
  // Awaited: closing the window ends the process, and on Windows a yt-dlp that
  // hasn't been killed yet is not killed with its parent — it keeps downloading
  // into a scratch directory nothing will ever clean up.
  await api.forceCancelAll().catch(() => {});
  if (action === "quit") {
    // Bypass minimize-to-tray: the user explicitly confirmed they want to quit.
    void api.forceQuit();
  } else {
    window.location.reload();
  }
}
