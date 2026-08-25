import { enqueueMany } from "@/lib/downloadManager";
import { notify } from "@/lib/toast";
import { folderName, joinPath } from "@/lib/paths";
import type { DownloadFormat, VideoQuality } from "@/types/media";

interface BulkStartInput {
  urls: string[];
  format: DownloadFormat;
  quality: VideoQuality;
  outputDirectory: string;
  /**
   * Set when the batch is one playlist rather than a hand-typed list. It gets
   * its own folder under the chosen directory and its own block in the queue.
   */
  playlist?: { title: string };
}

// Thin wrapper so pages stay decoupled from the manager module, same as
// useStartDownload — this just fans a batch of bare URLs into it.
export function useStartBulkDownload() {
  function start({ urls, format, quality, outputDirectory, playlist }: BulkStartInput) {
    if (!urls.length) return;
    if (!outputDirectory) {
      notify("No download folder selected. Choose one in Settings or pick a folder.", "error");
      return;
    }

    // Thirty loose files in Videos is not a playlist, it's a mess — so a
    // playlist always lands in a folder of its own name. The id is minted here,
    // once per batch, and every item carries it: that's what makes them one
    // block in the queue and one Cancel all.
    const directory = playlist
      ? joinPath(outputDirectory, folderName(playlist.title))
      : outputDirectory;
    const ref = playlist
      ? { id: crypto.randomUUID(), title: playlist.title, total: urls.length }
      : undefined;

    // One batch, one write. A playlist can be thousands of videos.
    enqueueMany(
      urls.map((url, index) => ({
        url,
        format,
        quality,
        outputDirectory: directory,
        playlist: ref,
        // Its place in the playlist, kept for as long as the download exists —
        // it is the only thing that can put a resume back in order.
        playlistIndex: ref ? index : undefined,
      })),
    );
  }

  return { start } as const;
}
