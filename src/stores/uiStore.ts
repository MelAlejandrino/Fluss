import { create } from "zustand";

export type Page = "home" | "downloads" | "history" | "settings";

interface UiState {
  page: Page;
  navigate: (page: Page) => void;
}

export const useUiStore = create<UiState>((set) => ({
  page: "home",
  navigate: (page) => set({ page }),
}));
