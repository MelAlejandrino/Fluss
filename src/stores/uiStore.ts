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
}

export const useUiStore = create<UiState>((set) => ({
  page: "home",
  navigate: (page) => set({ page }),
  pendingUrl: null,
  requestAnalyze: (url) => set({ page: "home", pendingUrl: url }),
  clearPendingUrl: () => set({ pendingUrl: null }),
}));
