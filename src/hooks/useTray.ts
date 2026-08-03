import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { api } from "@/lib/api";

/**
 * Listens for the tray "Quit" menu click. Rust emits `tray-quit-request`
 * so the frontend can cancel active downloads, then calls `force_quit`
 * which sets a flag and closes the window for real (bypassing minimize-to-tray).
 */
export function useTray() {
  useEffect(() => {
    const unlisten = api.onTrayQuitRequest(async () => {
      api.forceCancelAll();
      await invoke("force_quit");
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);
}
