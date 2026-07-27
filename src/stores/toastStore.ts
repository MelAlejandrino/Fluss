import { create } from "zustand";

export type ToastTone = "info" | "success" | "error";

export interface ToastAction {
  label: string;
  onClick?: () => void;
  primary?: boolean;
}

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  actions?: ToastAction[];
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: ToastTone, actions?: ToastAction[]) => void;
  dismiss: (id: string) => void;
}

const DURATION = 4000;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, tone = "info", actions) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, tone, actions }] }));
    // Toasts with actions stay until the user picks one; others auto-dismiss.
    if (!actions || actions.length === 0) {
      setTimeout(() => get().dismiss(id), DURATION);
    }
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
