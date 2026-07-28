import { create } from "zustand";
import type { LucideIcon } from "lucide-react";

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  /** Renders in the error color — destructive or irreversible actions. */
  danger?: boolean;
}

export type MenuEntry = MenuItem | "separator";

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  entries: MenuEntry[];
  show: (x: number, y: number, entries: MenuEntry[]) => void;
  hide: () => void;
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  open: false,
  x: 0,
  y: 0,
  entries: [],
  show: (x, y, entries) => set({ open: true, x, y, entries }),
  hide: () => set({ open: false, entries: [] }),
}));
