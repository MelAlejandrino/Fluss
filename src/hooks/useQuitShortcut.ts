import { useEffect } from "react";
import { requestInterrupt } from "@/lib/interrupt";

/// Ctrl/Cmd + Q → quit (PLAN §37). Provides a keyboard exit when the system
/// tray icon is invisible (common on GNOME) or the user simply prefers
/// keyboard over mouse.
export function useQuitShortcut() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "q") return;
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      e.preventDefault();
      requestInterrupt("quit");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
