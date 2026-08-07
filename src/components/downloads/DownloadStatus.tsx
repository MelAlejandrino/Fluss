import type { DownloadStatus as Status } from "@/types/download";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

/**
 * Status chip. The word is the message and the colour only reinforces it —
 * status is never carried by hue alone.
 *
 * `live` marks the two states that are genuinely in motion; their dot breathes
 * so a glance at a stack of cards separates "running" from "waiting" without
 * reading a single label.
 */
const MAP: Record<Status, { label: string; tone: BadgeTone; live?: boolean }> = {
  queued: { label: "Queued", tone: "neutral" },
  downloading: { label: "Downloading", tone: "accent", live: true },
  processing: { label: "Processing", tone: "accent", live: true },
  completed: { label: "Completed", tone: "accent" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function DownloadStatus({ status }: { status: Status }) {
  const { label, tone, live } = MAP[status];
  return (
    <Badge tone={tone} className={cn(live && "[&>span:first-child]:animate-pulse")} dot>
      {label}
    </Badge>
  );
}
