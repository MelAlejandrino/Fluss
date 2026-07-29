import { useEffect, useRef, useState } from "react";
import { useUiStore } from "@/stores/uiStore";

/**
 * Owns the URL field's text. Local state, except that the context menu's
 * "Paste & Analyze" can push a URL in from anywhere via `pendingUrl`.
 */
export function useUrlInput(onSubmit: (url: string) => void) {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingUrl = useUiStore((s) => s.pendingUrl);
  const clearPendingUrl = useUiStore((s) => s.clearPendingUrl);
  const newDownloadTick = useUiStore((s) => s.newDownloadTick);

  useEffect(() => {
    if (!pendingUrl) return;
    setUrl(pendingUrl);
    clearPendingUrl();
    onSubmit(pendingUrl);
    // onSubmit is recreated each render by the page; depending on it would
    // re-run this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUrl, clearPendingUrl]);

  // "New Download" while Home is already open: no remount, so clear the field
  // and put the cursor back in it by hand. Tick 0 is the initial mount, where
  // the input's own `autoFocus` has it covered.
  useEffect(() => {
    if (newDownloadTick === 0) return;
    setUrl("");
    inputRef.current?.focus();
  }, [newDownloadTick]);

  function submit() {
    onSubmit(url);
  }

  return { url, setUrl, submit, inputRef } as const;
}
