import { useEffect, useState } from "react";
import { useHistoryStore } from "@/stores/historyStore";
import { enqueue } from "@/lib/downloadManager";
import { openDownload, revealDownload } from "@/lib/fileActions";
import type { DownloadHistoryItem } from "@/types/download";
import type { HistoryGroup } from "@/lib/historyGroups";
import { byPlaylistOrder, hasFile } from "@/lib/downloadGroups";
import { verifyDownloadedFiles } from "@/lib/verifyFiles";

/// Read the stored history once at app start. Downloads are recorded from the
/// download manager, not this page — so without this the store would still be
/// empty when the first one completes, and saving that would wipe the file.
export function useHistoryInit() {
  const load = useHistoryStore((s) => s.load);
  useEffect(() => {
    load();
  }, [load]);
}

export function useHistory() {
  const history = useHistoryStore((s) => s.history);
  const load = useHistoryStore((s) => s.load);
  const remove = useHistoryStore((s) => s.remove);
  const removePlaylist = useHistoryStore((s) => s.removePlaylist);

  // Only true on the very first read — a revisit already has the list in the
  // store, so the page must not flash skeletons over real rows (PLAN §55).
  const [isLoading, setIsLoading] = useState(() => useHistoryStore.getState().history.length === 0);

  // Refresh from disk when the page mounts, then check that the files those
  // entries point at are still there. Deleting a folder is silent; this is the
  // only moment the app gets to notice.
  useEffect(() => {
    load()
      .then(() => verifyDownloadedFiles())
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [load]);

  function retry(item: DownloadHistoryItem) {
    enqueue({
      url: item.url,
      title: item.title,
      thumbnailUrl: item.thumbnailUrl,
      format: item.format,
      quality: item.quality ?? "best",
      outputDirectory: item.outputDirectory,
      previousTitle: item.title,
      // Kept, so a playlist fetched from history is still one block in the
      // queue — with its own Cancel all — rather than loose rows.
      playlist: item.playlist,
      // And its original place in that playlist.
      playlistIndex: item.playlistIndex,
      createdAt: item.createdAt,
    });
  }

  /// Re-fetch a playlist. Anything that didn't land is fetched first; if it all
  /// landed, this is a plain "download it again".
  ///
  /// In playlist order, not the order history happened to record them in —
  /// cancelling a playlist records the untouched videos in one batch and the
  /// interrupted one afterwards, so recording order would put the video with a
  /// half-downloaded file at the very end of the resume.
  function retryGroup(group: HistoryGroup) {
    // Not just the ones that failed: a video whose file was deleted is missing
    // from the folder exactly like one that never downloaded.
    const stalled = group.items.filter((i) => !hasFile(i));
    const wanted = stalled.length ? stalled : group.items;
    byPlaylistOrder(wanted).forEach(retry);
  }

  /// Drop a whole playlist from the list — every attempt at every video in it,
  /// not just the ones the block has room to show. Removing history never
  /// touches the files on disk (PLAN §31).
  function removeGroup(group: HistoryGroup) {
    if (group.playlist) {
      removePlaylist(group.playlist.id);
      return;
    }
    group.items.forEach((item) => remove(item.id));
  }

  return {
    history,
    isLoading,
    open: openDownload,
    showInFolder: revealDownload,
    retry,
    retryGroup,
    remove,
    removeGroup,
  } as const;
}
