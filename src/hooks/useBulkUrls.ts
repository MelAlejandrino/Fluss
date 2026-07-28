import { useState } from "react";

/** Owns the list of URL fields for bulk download — text only, no submission. */
export function useBulkUrls() {
  const [urls, setUrls] = useState<string[]>(["", ""]);

  function updateUrl(index: number, value: string) {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  }

  function addUrl() {
    setUrls((prev) => [...prev, ""]);
  }

  function removeUrl(index: number) {
    setUrls((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function reset() {
    setUrls(["", ""]);
  }

  // What actually gets queued: trimmed, blanks dropped, duplicates collapsed
  // so a stray double-paste doesn't download the same video twice.
  const validUrls = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];

  return { urls, updateUrl, addUrl, removeUrl, reset, validUrls } as const;
}
