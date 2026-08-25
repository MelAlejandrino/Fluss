import { useMemo, useState } from "react";
import type { DownloadHistoryItem } from "@/types/download";
import { groupHistory } from "@/lib/historyGroups";

export type HistoryFilter = "all" | "completed" | "failed";

/**
 * Client-side search and status filter over the history list.
 *
 * History is a local JSON file that only ever holds what one person
 * downloaded, so filtering in memory is both fast enough and the only honest
 * option — there is no server to ask. Matching covers title *and* URL: half
 * the time you remember the link, not what the site called the video.
 */
export function useHistoryFilter(history: DownloadHistoryItem[]) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((item) => {
      // "failed" folds in cancelled: from the outside both mean "no file".
      const matchesStatus =
        filter === "all" ||
        (filter === "completed" && item.status === "completed") ||
        (filter === "failed" && item.status !== "completed");
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
        // Searching the playlist name finds everything that came from it, even
        // when no individual video is called that.
        (item.playlist?.title.toLowerCase().includes(q) ?? false)
      );
    });
  }, [history, query, filter]);

  return {
    query,
    setQuery,
    filter,
    setFilter,
    filtered,
    // What the page actually renders: one row per download, or one block per
    // playlist. Grouping *after* filtering means a search narrows what's inside
    // a playlist rather than hiding the playlist itself.
    groups: groupHistory(filtered, history),
    /** True when a filter is hiding everything, rather than history being empty. */
    isFiltered: query.trim().length > 0 || filter !== "all",
  } as const;
}
