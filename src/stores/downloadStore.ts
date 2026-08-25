import { create } from "zustand";
import { api } from "@/lib/api";
import { persist } from "@/lib/persist";
import type { DownloadItem } from "@/types/download";

interface DownloadState {
  downloads: DownloadItem[];
  add: (item: DownloadItem) => void;
  /// A whole batch in one update and one write.
  addMany: (items: DownloadItem[]) => void;
  update: (id: string, patch: Partial<DownloadItem>) => void;
  remove: (id: string) => void;
  /// Replace the queue with what survived the last session.
  restore: (items: DownloadItem[]) => void;
}

// Lives outside page components so a download survives navigation (PLAN §43).
// Saving happens *after* the state is set, never inside the updater: a write
// that throws must not take the queue update down with it. The list in memory
// is what the app runs on; the file is a convenience.
export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: [],
  add: (item) => {
    set((s) => ({ downloads: [item, ...s.downloads] }));
    saveQueue(get().downloads);
  },
  addMany: (items) => {
    if (!items.length) return;
    set((s) => ({ downloads: [...items, ...s.downloads] }));
    saveQueue(get().downloads);
  },
  update: (id, patch) => {
    set((s) => ({
      downloads: s.downloads.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
    // Progress arrives ten times a second. Only a change in what the queue
    // *is* — an item arriving, leaving, or changing state — is worth a write;
    // a percentage isn't worth resuming from and isn't worth the disk.
    if (patch.status !== undefined) saveQueue(get().downloads);
  },
  remove: (id) => {
    set((s) => ({ downloads: s.downloads.filter((d) => d.id !== id) }));
    saveQueue(get().downloads);
  },
  restore: (items) => set({ downloads: items }),
}));

/// What's worth writing down: anything that hasn't finished yet.
///
/// Completed, failed and cancelled items are already in history, which is the
/// permanent record — carrying them here too would mean a second copy that can
/// disagree with it, and a "Recent" band that never empties.
function unfinished(downloads: DownloadItem[]): DownloadItem[] {
  return downloads.filter(
    (d) => d.status === "queued" || d.status === "downloading" || d.status === "processing",
  );
}

function saveQueue(downloads: DownloadItem[]) {
  // Not gated on a `loaded` flag the way history is: the queue file is written
  // from one place only and holds no record worth protecting, so the worst case
  // is losing a resumable item rather than destroying the user's own data.
  // `async` so a throw becomes a rejection persist can report, rather than an
  // exception thrown back at whoever changed a download's status.
  persist("queue", async () => api.saveQueue(unfinished(downloads)));
}

/// Bring back the queue from the last session.
///
/// Anything that was mid-flight is put back to "queued": its yt-dlp process
/// died with the app, and there is no such thing as a running download we
/// aren't attached to. The id is deliberately kept — the engine's scratch
/// directory is keyed by it, so a restarted item finds its own half-downloaded
/// file and carries on instead of starting the video again.
export function restoredQueue(stored: DownloadItem[]): DownloadItem[] {
  return stored.filter(unfinishedStatus).map((item) => ({
    ...item,
    status: "queued" as const,
    progress: 0,
    speed: undefined,
    eta: undefined,
    // Its own title, so the partial-file restore has a name to match against.
    previousTitle: item.previousTitle ?? item.title,
  }));
}

function unfinishedStatus(item: DownloadItem): boolean {
  return item.status === "queued" || item.status === "downloading" || item.status === "processing";
}
