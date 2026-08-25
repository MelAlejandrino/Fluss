import type { DownloadItem, DownloadStatus, PlaylistRef } from "@/types/download";

/// A band of the list that belongs together. Loose items — anything not from a
/// playlist — share the one group with no `playlist`, which renders exactly as
/// the list always did.
export interface PlaylistGroup {
  playlist?: PlaylistRef;
  /** The items from this band, in list order. */
  items: DownloadItem[];
  /** Counts across the whole playlist, not just this band. */
  done: number;
  unfinished: number;
  total: number;
}

/// Is this one still going to happen?
export function isPending(item: DownloadItem): boolean {
  return item.status === "queued" || item.status === "downloading" || item.status === "processing";
}

/// Is there no file for this one? Either it never finished, or it did and the
/// file has since been deleted — both mean the same thing to someone looking at
/// a playlist folder, and both are fixed by downloading it again.
export function isUnfinished(item: { status: DownloadStatus; fileMissing?: boolean }): boolean {
  return item.status === "failed" || item.status === "cancelled" || item.fileMissing === true;
}

/// Did this one actually produce a file that is still there?
export function hasFile(item: { status: DownloadStatus; fileMissing?: boolean }): boolean {
  return item.status === "completed" && !item.fileMissing;
}

/// A playlist in its own order: video 1 first, however the items reached us.
///
/// The store is newest-first and history is in the order things were *recorded*
/// — neither is the order of the playlist. That matters for more than looks:
/// this is the order a resume re-queues in, and the video that was interrupted
/// has to go first or its half-downloaded file waits behind twenty-seven others.
///
/// The position is what's authoritative; `createdAt` is only the fallback for
/// downloads that were never part of a playlist.
export function byPlaylistOrder<T extends { createdAt: string; playlistIndex?: number }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    if (a.playlistIndex !== undefined && b.playlistIndex !== undefined) {
      return a.playlistIndex - b.playlistIndex;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/// Split one band of the list into playlist blocks, in the order they appear.
///
/// Counts come from `all`, not from the band: by the time a playlist is half
/// done its finished items have left the queue, and "3 of 30" is the number
/// worth showing on the ones still waiting. The same block in "Recent" needs
/// the same total to say how much of the playlist actually landed.
export function groupByPlaylist(band: DownloadItem[], all: DownloadItem[]): PlaylistGroup[] {
  const groups: PlaylistGroup[] = [];
  const byKey = new Map<string, PlaylistGroup>();

  for (const item of band) {
    const key = item.playlist?.id ?? "";
    let group = byKey.get(key);
    if (!group) {
      const siblings = item.playlist ? all.filter((d) => d.playlist?.id === item.playlist?.id) : [];
      // The playlist's own total, not the number of rows still in the queue.
      // A restart drops the completed members from the store — counting rows
      // would turn "6 of 12 downloaded" into "0 of 6".
      const total = item.playlist?.total ?? siblings.length;
      const accountedFor = siblings.filter((d) => !hasFile(d)).length;
      group = {
        playlist: item.playlist,
        items: [],
        done: Math.max(0, total - accountedFor),
        unfinished: siblings.filter(isUnfinished).length,
        total,
      };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }

  for (const group of groups) {
    if (group.playlist) group.items = byPlaylistOrder(group.items);
  }

  return groups;
}
