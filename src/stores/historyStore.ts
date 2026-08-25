import { create } from "zustand";
import { api } from "@/lib/api";
import { persist, reportUnreadable } from "@/lib/persist";
import type { DownloadHistoryItem } from "@/types/download";

interface HistoryState {
  history: DownloadHistoryItem[];
  /// The file on disk is damaged — saves are suspended so we don't destroy it.
  unreadable: boolean;
  /// Whether we've read the file yet. Saving before that would write our empty
  /// starting list over the real one.
  loaded: boolean;
  load: () => Promise<void>;
  add: (item: DownloadHistoryItem) => void;
  /// Several at once, in one write — cancelling a playlist records every video
  /// it was still going to fetch.
  addMany: (items: DownloadHistoryItem[]) => void;
  remove: (id: string) => void;
  /// Every entry belonging to one playlist, in a single write.
  removePlaylist: (playlistId: string) => void;
  /// Flag the completed entries whose file is no longer on disk, and unflag the
  /// ones that are back. Saves only when something actually changed — this runs
  /// on every visit to History.
  markMissing: (missingPaths: ReadonlySet<string>) => void;
}

// Persisted to disk via Rust; we mirror it in memory and re-save the whole
// array on each change (the list is small).
export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  unreadable: false,
  loaded: false,
  load: async () => {
    try {
      const stored = await api.getHistory();
      // A download can finish before this read returns — those entries aren't
      // on disk yet, so carry them across the swap instead of dropping them.
      const unsaved = get().history.filter((h) => !stored.some((s) => s.id === h.id));
      set({ history: [...unsaved, ...stored], unreadable: false, loaded: true });
      if (unsaved.length) save(get);
    } catch {
      // Rust yields an empty list for a *missing* file, so a rejection means
      // the file is there and damaged. It's the only record of what was
      // downloaded and where — don't let the next `add` overwrite it.
      if (get().unreadable) return; // already told them; load() runs per visit
      set({ unreadable: true, loaded: true });
      reportUnreadable("history", () => set({ unreadable: false }));
    }
  },
  add: (item) => {
    const history = [item, ...get().history];
    set({ history });
    save(get);
  },
  addMany: (items) => {
    if (!items.length) return;
    const history = [...items, ...get().history];
    set({ history });
    save(get);
  },
  markMissing: (missingPaths) => {
    let changed = false;
    const history = get().history.map((item) => {
      if (item.status !== "completed" || !item.filePath) return item;
      const gone = missingPaths.has(item.filePath);
      if (gone === (item.fileMissing ?? false)) return item;
      changed = true;
      return { ...item, fileMissing: gone };
    });
    if (!changed) return;
    set({ history });
    save(get);
  },
  remove: (id) => {
    const history = get().history.filter((h) => h.id !== id);
    set({ history });
    save(get);
  },
  removePlaylist: (playlistId) => {
    // Matched on the playlist, not on the rows the page is showing. A playlist
    // block lists one entry per video — the latest outcome — while history can
    // hold several for the same video, one per attempt. Removing only what was
    // on screen left the older attempts behind, and they simply rebuilt the
    // block: it took a click per round of attempts to clear one playlist.
    const history = get().history.filter((h) => h.playlist?.id !== playlistId);
    if (history.length === get().history.length) return;
    set({ history });
    save(get);
  },
}));

/// Skipped while the stored file is unreadable — our in-memory list is not the
/// whole truth, and writing it would discard the rest.
function save(get: () => HistoryState) {
  const { history, unreadable, loaded } = get();
  if (unreadable) return;
  if (!loaded) {
    // Nothing has read the file yet, so this list is missing everything already
    // on disk. Read first; `load`'s merge carries this entry through and saves
    // it. Self-healing on purpose — persistence must not quietly stop working
    // just because the startup hook in App.tsx got unwired.
    // ponytail: concurrent adds can each kick a load. The merge is idempotent,
    // so the cost is a duplicate read, not a wrong file.
    void get().load();
    return;
  }
  persist("history", () => api.saveHistory(history));
}
