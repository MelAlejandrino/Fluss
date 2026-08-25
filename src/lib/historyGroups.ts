import type { DownloadHistoryItem, PlaylistRef } from "@/types/download";
import { byPlaylistOrder, hasFile } from "@/lib/downloadGroups";

/// One entry in the history list: either a single download, or a playlist
/// standing in for all of its videos.
///
/// A thirty-video playlist is one thing the user did. Thirty rows in history
/// buries every other download they made that week, and there is no row that
/// represents the playlist itself — nothing to re-fetch, nothing to open the
/// folder with.
export interface HistoryGroup {
  /** Stable key: the playlist id, or the single item's id. */
  key: string;
  playlist?: PlaylistRef;
  items: DownloadHistoryItem[];
  completed: number;
  unfinished: number;
  /** Videos in the playlist — not rows shown, which a filter can narrow. */
  total: number;
  /** Newest timestamp in the group — what the group is sorted and dated by. */
  at: string;
}

/// One entry per video, keeping the newest attempt. The list is newest-first,
/// so the first sighting of a URL is the latest outcome.
function dedupeByUrl(items: DownloadHistoryItem[]): DownloadHistoryItem[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.url) ? false : (seen.add(item.url), true)));
}

function timeOf(item: DownloadHistoryItem): string {
  return item.completedAt ?? item.createdAt;
}

/// Fold a history list into rows, keeping the list's existing newest-first
/// order. A playlist takes the position of its newest member, so re-fetching
/// an old playlist doesn't shuffle the whole page.
///
/// `all` is the unfiltered history, and the counts come from it. A search or an
/// outcome filter narrows which videos are *listed*; it must not change what a
/// playlist is. Counting only the visible rows made "Completed" render a
/// playlist of 30 with 18 failures as "12 downloaded", no Resume button, and no
/// sign that anything was wrong with it.
export function groupHistory(
  history: DownloadHistoryItem[],
  all: DownloadHistoryItem[] = history,
): HistoryGroup[] {
  const groups: HistoryGroup[] = [];
  const byPlaylist = new Map<string, HistoryGroup>();

  for (const item of history) {
    if (!item.playlist) {
      groups.push({
        key: item.id,
        items: [item],
        completed: hasFile(item) ? 1 : 0,
        unfinished: hasFile(item) ? 0 : 1,
        total: 1,
        at: timeOf(item),
      });
      continue;
    }

    const existing = byPlaylist.get(item.playlist.id);
    if (existing) {
      // Resuming a playlist records a second entry for the same video — the
      // failed attempt and the one that worked. In a block that says "26 of 30"
      // that would count the video twice and put both rows in the list. The
      // list is newest-first, so the one already here is the latest outcome and
      // the older attempt is dropped.
      if (existing.items.some((seen) => seen.url === item.url)) continue;

      existing.items.push(item);
      // Counts already cover the whole playlist — see the group's creation.
      // The list is newest-first, so a later arrival is older — the group keeps
      // the newest time it has seen.
      if (timeOf(item) > existing.at) existing.at = timeOf(item);
      continue;
    }

    // One entry per video across the whole history, so a filtered view still
    // reports the playlist honestly.
    const members = dedupeByUrl(all.filter((h) => h.playlist?.id === item.playlist?.id));
    const group: HistoryGroup = {
      key: item.playlist.id,
      playlist: item.playlist,
      items: [item],
      completed: members.filter(hasFile).length,
      unfinished: members.filter((h) => !hasFile(h)).length,
      total: members.length,
      at: timeOf(item),
    };
    byPlaylist.set(item.playlist.id, group);
    groups.push(group);
  }

  // Sorted last, so the dedupe above still sees the list newest-first and keeps
  // each video's latest outcome.
  for (const group of groups) {
    if (group.playlist) group.items = byPlaylistOrder(group.items);
  }

  return groups;
}
