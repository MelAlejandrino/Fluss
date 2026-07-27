import { create } from "zustand";
import type { DownloadItem } from "@/types/download";

interface DownloadState {
  downloads: DownloadItem[];
  add: (item: DownloadItem) => void;
  update: (id: string, patch: Partial<DownloadItem>) => void;
  remove: (id: string) => void;
}

// Lives outside page components so a download survives navigation (PLAN §43).
export const useDownloadStore = create<DownloadState>((set) => ({
  downloads: [],
  add: (item) => set((s) => ({ downloads: [item, ...s.downloads] })),
  update: (id, patch) =>
    set((s) => ({
      downloads: s.downloads.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })),
  remove: (id) => set((s) => ({ downloads: s.downloads.filter((d) => d.id !== id) })),
}));
