import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-on-surface-variant">
      <Loader2 className="size-4 animate-spin text-primary" strokeWidth={1.5} />
      {label}
    </div>
  );
}
