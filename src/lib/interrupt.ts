import { invoke } from "@tauri-apps/api/core";
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
  api.forceCancelAll();
  if (action === "quit") {
    // Bypass minimize-to-tray: the user explicitly confirmed they want to quit.
    invoke("force_quit");
  } else {
    window.location.reload();
  }
}
