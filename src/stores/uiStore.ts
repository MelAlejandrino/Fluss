import { create } from "zustand";

export type Page = "home" | "downloads" | "history" | "settings";

interface UiState {
  page: Page;
  navigate: (page: Page) => void;
  /**
   * A URL pushed at the Home page from outside it (the context menu's
   * "Paste URL & Analyze"). The URL input consumes it, then clears it.
   */
  pendingUrl: string | null;
  requestAnalyze: (url: string) => void;
  clearPendingUrl: () => void;
  /**
   * Bumped by "New Download" (sidebar button, Ctrl/Cmd+N). Navigating to Home
   * isn't enough on its own: if Home is already the current page it doesn't
   * remount, so the URL field keeps its text and `autoFocus` never re-fires.
   * Home's hooks watch this to clear and refocus.
   */
  newDownloadTick: number;
  newDownload: () => void;
  /**
   * Set while the app's own "downloads are still active" dialog is up, for a
   * quit or a reload. Lives here rather than in App's local state because the
   * context menu — a plain module, not a component — also raises it.
   */
  pendingInterrupt: "quit" | "reload" | null;
  setPendingInterrupt: (action: "quit" | "reload" | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  page: "home",
  navigate: (page) => set({ page }),
  pendingUrl: null,
  requestAnalyze: (url) => set({ page: "home", pendingUrl: url }),
  clearPendingUrl: () => set({ pendingUrl: null }),
  newDownloadTick: 0,
  newDownload: () => set((s) => ({ page: "home", newDownloadTick: s.newDownloadTick + 1 })),
  pendingInterrupt: null,
  setPendingInterrupt: (pendingInterrupt) => set({ pendingInterrupt }),
}));
