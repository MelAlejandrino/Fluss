import { useEffect, useState } from "react";
import { useUiStore } from "@/stores/uiStore";

/**
 * Owns the URL field's text. Local state, except that the context menu's
 * "Paste & Analyze" can push a URL in from anywhere via `pendingUrl`.
 */
export function useUrlInput(onSubmit: (url: string) => void) {
  const [url, setUrl] = useState("");
  const pendingUrl = useUiStore((s) => s.pendingUrl);
  const clearPendingUrl = useUiStore((s) => s.clearPendingUrl);

  useEffect(() => {
    if (!pendingUrl) return;
    setUrl(pendingUrl);
    clearPendingUrl();
    onSubmit(pendingUrl);
    // onSubmit is recreated each render by the page; depending on it would
    // re-run this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUrl, clearPendingUrl]);

  function submit() {
    onSubmit(url);
  }

  return { url, setUrl, submit } as const;
}
