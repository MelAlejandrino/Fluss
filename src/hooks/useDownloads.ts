import { useEffect } from "react";
import { useDownloadStore } from "@/stores/downloadStore";
import {
  cancel as cancelDownload,
  cancelGroup as cancelPlaylist,
  retryGroup as retryPlaylist,
  retry as retryDownload,
} from "@/lib/downloadManager";
import { groupByPlaylist } from "@/lib/downloadGroups";
import { openDownload, revealDownload } from "@/lib/fileActions";
import { verifyDownloadedFiles } from "@/lib/verifyFiles";

export function useDownloads() {
  const downloads = useDownloadStore((s) => s.downloads);

  // Files can vanish between visits — a deleted folder is silent. Checking on
  // mount is what keeps "6 of 12 downloaded" true and gives Resume something
  // to do about it.
  useEffect(() => {
    void verifyDownloadedFiles();
  }, []);

  const active = downloads.filter((d) => d.status === "downloading" || d.status === "processing");
  const queued = downloads.filter((d) => d.status === "queued");
  const finished = downloads.filter(
    (d) => d.status === "completed" || d.status === "failed" || d.status === "cancelled",
  );

  return {
    downloads,
    active,
    queued,
    // The same items, banded by the playlist they came from.
    queuedGroups: groupByPlaylist(queued, downloads),
    finished,
    finishedGroups: groupByPlaylist(finished, downloads),
    open: openDownload,
    reveal: revealDownload,
    cancel: cancelDownload,
    cancelPlaylist,
    retryPlaylist,
    retry: retryDownload,
  } as const;
}
