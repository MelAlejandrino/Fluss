import { create } from "zustand";
import { api } from "@/lib/api";
import type { DownloadHistoryItem } from "@/types/download";

interface HistoryState {
  history: DownloadHistoryItem[];
  load: () => Promise<void>;
  add: (item: DownloadHistoryItem) => void;
  remove: (id: string) => void;
}

// Persisted to disk via Rust; we mirror it in memory and re-save the whole
// array on each change (the list is small).
export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  load: async () => {
    try {
      set({ history: await api.getHistory() });
    } catch {
      /* first run / unreadable file → keep empty */
    }
  },
  add: (item) => {
    const history = [item, ...get().history];
    set({ history });
    api.saveHistory(history).catch(() => {});
  },
  remove: (id) => {
    const history = get().history.filter((h) => h.id !== id);
    set({ history });
    api.saveHistory(history).catch(() => {});
  },
}));
