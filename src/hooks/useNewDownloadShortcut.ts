import { useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";

/// Ctrl/Cmd + N → new download (PLAN §37). Same destination as the sidebar's
/// "New Download" button: Home, where the URL field lives and autofocuses.
export function useNewDownloadShortcut() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Bare Ctrl/Cmd + N only — Ctrl+Shift+N and Ctrl+Alt+N belong to the OS
      // and the browser (incognito window), so leave them alone.
      if (e.key.toLowerCase() !== "n") return;
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      // Otherwise the webview opens a new window on Windows.
      e.preventDefault();
      useUiStore.getState().newDownload();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
