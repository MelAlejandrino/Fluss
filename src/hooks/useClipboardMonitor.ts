import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";
import { api } from "@/lib/api";
import { notify } from "@/lib/toast";

/**
 * Broad URL pattern — catches anything yt-dlp might support without
 * maintaining a site list.  Two forms:
 *   • protocol URL:  https://example.com/…
 *   • bare domain:   www.example.com/…
 *
 * Deliberately excludes very short strings (< 10 chars) and very long
 * ones (> 2048) to reduce false positives from random clipboard text.
 */
const URL_RE = /^(?:https?:\/\/|www\.)\S{8,2048}$/i;

function isMediaUrl(text: string): boolean {
  const trimmed = text.trim();
  return URL_RE.test(trimmed);
}

const POLL_MS = 1500;

export function useClipboardMonitor() {
  const enabled = useSettingsStore((s) => s.settings.clipboardMonitoring);
  const requestAnalyze = useUiStore((s) => s.requestAnalyze);
  const lastSeen = useRef<string>("");

  useEffect(() => {
    if (!enabled) return;

    // Skip the very first read — stale clipboard content from before the
    // setting was turned on would immediately fire a toast.
    let skippedFirst = false;

    const id = setInterval(async () => {
      try {
        const text = await api.readClipboard();
        if (!text) return;
        const trimmed = text.trim();
        if (!trimmed || trimmed === lastSeen.current) return;
        if (!skippedFirst) {
          lastSeen.current = trimmed;
          skippedFirst = true;
          return;
        }
        if (!isMediaUrl(trimmed)) return;

        lastSeen.current = trimmed;

        notify("Media URL detected in clipboard", "info", [
          {
            label: "Download",
            primary: true,
            onClick: () => requestAnalyze(trimmed),
          },
          { label: "Dismiss" },
        ]);
      } catch {
        // Clipboard access can fail silently (e.g. empty clipboard on some
        // platforms).  Swallow — the next tick will try again.
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [enabled, requestAnalyze]);
}
