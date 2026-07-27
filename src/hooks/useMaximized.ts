import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// Tracks whether the window is maximized so the title bar can swap its icon.
export function useMaximized() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const sync = () => api.windowIsMaximized().then(setMaximized);
    sync();
    api.onWindowResized(sync).then((fn) => (unlisten = fn));
    return () => unlisten?.();
  }, []);

  return maximized;
}
