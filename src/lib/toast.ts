import { useToastStore, type ToastTone, type ToastAction } from "@/stores/toastStore";

// Fire a toast from anywhere (hooks, managers) without a React context.
export function notify(message: string, tone?: ToastTone, actions?: ToastAction[]) {
  useToastStore.getState().push(message, tone, actions);
}
