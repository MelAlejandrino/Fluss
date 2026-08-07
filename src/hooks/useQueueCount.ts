import { useDownloadStore } from "@/stores/downloadStore";

/**
 * How much work is outstanding, for the nav badge.
 *
 * Counts running *and* waiting items together: from the rail the useful
 * question is "is there anything left to do", not "how is the current one
 * going" — that answer lives on the Downloads page itself.
 */
export function useQueueCount(): number {
  return useDownloadStore(
    (s) =>
      s.downloads.filter(
        (d) => d.status === "downloading" || d.status === "processing" || d.status === "queued",
      ).length,
  );
}
