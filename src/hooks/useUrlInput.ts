import { useEffect, useRef, useState } from "react";
import { useUiStore } from "@/stores/uiStore";

/**
 * Owns the URL field's text and its one validation rule.
 *
 * The empty-field check lives here rather than in the view so the command bar
 * stays pure markup, and it's answered inline under the field instead of as an
 * error card — "you didn't type anything" is a nudge, not a failure report.
 *
 * The context menu's "Paste & Analyze" can push a URL in from anywhere via
 * `pendingUrl`.
 */
export function useUrlInput(onSubmit: (url: string) => void) {
  const [url, setUrlState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingUrl = useUiStore((s) => s.pendingUrl);
  const clearPendingUrl = useUiStore((s) => s.clearPendingUrl);
  const newDownloadTick = useUiStore((s) => s.newDownloadTick);

  useEffect(() => {
    if (!pendingUrl) return;
    setUrlState(pendingUrl);
    setError(null);
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
    setUrlState("");
    setError(null);
    inputRef.current?.focus();
  }, [newDownloadTick]);

  /** Typing is the user answering the complaint — clear it on the first keystroke. */
  function setUrl(value: string) {
    setUrlState(value);
    setError(null);
  }

  function submit() {
    if (!url.trim()) {
      setError("Enter a URL to analyze.");
      inputRef.current?.focus();
      return;
    }
    setError(null);
    onSubmit(url);
  }

  return { url, setUrl, submit, inputRef, error } as const;
}
