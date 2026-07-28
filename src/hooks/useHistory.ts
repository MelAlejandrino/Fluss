import { useEffect, useState } from "react";
import { useHistoryStore } from "@/stores/historyStore";
import { enqueue } from "@/lib/downloadManager";
import { openDownload, revealDownload } from "@/lib/fileActions";
import type { DownloadHistoryItem } from "@/types/download";

export function useHistory() {
  const history = useHistoryStore((s) => s.history);
  const load = useHistoryStore((s) => s.load);
  const remove = useHistoryStore((s) => s.remove);

  // Only true on the very first read — a revisit already has the list in the
  // store, so the page must not flash skeletons over real rows (PLAN §55).
  const [isLoading, setIsLoading] = useState(() => useHistoryStore.getState().history.length === 0);

  // Refresh from disk when the page mounts.
  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  function retry(item: DownloadHistoryItem) {
    enqueue({
      url: item.url,
      title: item.title,
      thumbnailUrl: item.thumbnailUrl,
      format: item.format,
      quality: item.quality ?? "best",
      outputDirectory: item.outputDirectory,
    });
  }

  // Removing history never touches the file on disk (PLAN §31).
  return {
    history,
    isLoading,
    open: openDownload,
    showInFolder: revealDownload,
    retry,
    remove,
  } as const;
}
