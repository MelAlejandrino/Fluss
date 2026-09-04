import { useEffect } from "react";
import { api } from "@/lib/api";

/**
 * Listens for the tray "Quit" menu click. Rust emits `tray-quit-request`
 * so the frontend can cancel active downloads, then calls `force_quit`
 * which sets a flag and closes the window for real (bypassing minimize-to-tray).
 */
export function useTray() {
  useEffect(() => {
    const unlisten = api.onTrayQuitRequest(async () => {
      // Kill first, then quit: an unawaited cancel loses the race with the
      // window closing and leaves yt-dlp running.
      await api.forceCancelAll().catch(() => {});
      await api.forceQuit();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);
}
