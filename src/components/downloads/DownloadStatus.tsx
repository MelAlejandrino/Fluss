import { Check, Download, Clock, X, AlertTriangle, Cog } from "lucide-react";
import type { DownloadStatus as Status } from "@/types/download";

// Text + icon + color, never color alone (a11y, DESIGN §50).
const MAP: Record<Status, { label: string; icon: typeof Check; className: string }> = {
  queued: { label: "Queued", icon: Clock, className: "text-on-surface-variant" },
  analyzing: { label: "Analyzing", icon: Cog, className: "text-on-surface-variant" },
  downloading: { label: "Downloading", icon: Download, className: "text-primary" },
  processing: { label: "Processing", icon: Cog, className: "text-primary" },
  completed: { label: "Completed", icon: Check, className: "text-primary" },
  failed: { label: "Failed", icon: AlertTriangle, className: "text-error" },
  cancelled: { label: "Cancelled", icon: X, className: "text-on-surface-variant" },
};

export function DownloadStatus({ status }: { status: Status }) {
  const { label, icon: Icon, className } = MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest ${className}`}
    >
      <Icon className="size-3.5" strokeWidth={2} />
      {label}
    </span>
  );
}
