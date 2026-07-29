import { useEffect } from "react";
import { requestInterrupt } from "@/lib/interrupt";

/**
 * Ctrl/Cmd+R and F5 reload the webview natively — no `beforeunload`, no dialog
 * of ours, and the download UI is gone while yt-dlp keeps going. Intercept them
 * so a reload goes through the same confirmation the context menu does.
 */
export function useReloadShortcut() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const reloadKey =
        e.key === "F5" || (e.key.toLowerCase() === "r" && (e.ctrlKey || e.metaKey));
      if (!reloadKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      requestInterrupt("reload");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
