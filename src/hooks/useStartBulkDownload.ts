import { enqueue } from "@/lib/downloadManager";
import { notify } from "@/lib/toast";
import type { DownloadFormat, VideoQuality } from "@/types/media";

interface BulkStartInput {
  urls: string[];
  format: DownloadFormat;
  quality: VideoQuality;
  outputDirectory: string;
}

// Thin wrapper so pages stay decoupled from the manager module, same as
// useStartDownload — this just fans a batch of bare URLs into it.
export function useStartBulkDownload() {
  function start({ urls, format, quality, outputDirectory }: BulkStartInput) {
    if (!urls.length) return;
    if (!outputDirectory) {
      notify("No download folder selected. Choose one in Settings or pick a folder.", "error");
      return;
    }
    urls.forEach((url) => enqueue({ url, format, quality, outputDirectory }));
  }

  return { start } as const;
}
