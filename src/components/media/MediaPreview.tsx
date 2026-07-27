import { Clock, User } from "lucide-react";
import type { VideoMetadata } from "@/types/media";
import { formatDuration } from "@/lib/formatters";

export function MediaPreview({ metadata }: { metadata: VideoMetadata }) {
  return (
    <div className="flex gap-4 rounded-sm border border-outline-variant bg-surface-container-low p-4">
      <div className="aspect-video w-44 shrink-0 overflow-hidden rounded-sm border border-outline-variant bg-surface-container-high">
        {metadata.thumbnailUrl && (
          <img
            src={metadata.thumbnailUrl}
            alt=""
            className="size-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-col gap-2 py-1">
        <h2 className="font-display text-lg leading-tight text-on-surface">{metadata.title}</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-on-surface-variant">
          {metadata.uploader && (
            <span className="inline-flex items-center gap-1.5">
              <User className="size-4" strokeWidth={1.5} />
              {metadata.uploader}
            </span>
          )}
          {metadata.duration !== undefined && (
            <span className="inline-flex items-center gap-1.5 font-mono text-xs">
              <Clock className="size-4" strokeWidth={1.5} />
              {formatDuration(metadata.duration)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
