import { useDownloadStore } from "@/stores/downloadStore";
import { cancel as cancelDownload, retry as retryDownload } from "@/lib/downloadManager";
import { openDownload, revealDownload } from "@/lib/fileActions";

export function useDownloads() {
  const downloads = useDownloadStore((s) => s.downloads);
  const active = downloads.filter((d) => d.status === "downloading" || d.status === "processing");
  const queued = downloads.filter((d) => d.status === "queued");
  const finished = downloads.filter(
    (d) => d.status === "completed" || d.status === "failed" || d.status === "cancelled",
  );

  return {
    downloads,
    active,
    queued,
    finished,
    open: openDownload,
    reveal: revealDownload,
    cancel: cancelDownload,
    retry: retryDownload,
  } as const;
}
