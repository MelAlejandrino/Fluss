import { useEffect } from "react";
import { api } from "@/lib/api";
import { useDownloadStore } from "@/stores/downloadStore";

// Subscribe once (app-level) to Rust progress events and fan them into the store.
export function useDownloadEvents() {
  const update = useDownloadStore((s) => s.update);

  useEffect(() => {
    const unlistenMeta = api.onDownloadMeta((e) => {
      // Only fills gaps: bulk items start with neither, while single-flow items
      // already have both from the preview step.
      const current = useDownloadStore.getState().downloads.find((d) => d.id === e.downloadId);
      if (!current) return;
      const patch: { title?: string; thumbnailUrl?: string } = {};
      if (!current.title && e.title) patch.title = e.title;
      if (!current.thumbnailUrl && e.thumbnailUrl) patch.thumbnailUrl = e.thumbnailUrl;
      if (Object.keys(patch).length) update(e.downloadId, patch);
    });

    const unlisten = api.onDownloadProgress((e) => {
      const current = useDownloadStore.getState().downloads.find((d) => d.id === e.downloadId);
      if (!current) return;
      // Ignore late events once a download has finished/failed/cancelled.
      if (current.status !== "downloading" && current.status !== "processing") return;

      // Rust tags the phase authoritatively: "processing" = audio/merge tail.
      // Once processing, never fall back to downloading.
      if (e.status === "processing" || current.status === "processing") {
        update(e.downloadId, { status: "processing", speed: e.speed });
        return;
      }

      update(e.downloadId, {
        progress: e.progress,
        downloadedBytes: e.downloadedBytes,
        totalBytes: e.totalBytes,
        speed: e.speed,
        eta: e.eta,
      });
    });
    return () => {
      unlistenMeta.then((fn) => fn());
      unlisten.then((fn) => fn());
    };
  }, [update]);
}
