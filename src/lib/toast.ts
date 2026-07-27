import { useToastStore, type ToastTone } from "@/stores/toastStore";

// Fire a toast from anywhere (hooks, managers) without a React context.
export function notify(message: string, tone?: ToastTone) {
  useToastStore.getState().push(message, tone);
}
