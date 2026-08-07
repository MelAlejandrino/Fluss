import { User, Globe } from "lucide-react";
import type { VideoMetadata } from "@/types/media";
import { formatDuration, formatHost } from "@/lib/formatters";
import { Card } from "@/components/ui/Card";

/**
 * Confirmation that Fluss found the right thing before anyone commits to a
 * download. Artwork is full-bleed to the card's own edge — the preview *is*
 * the picture, and floating it inside padding would make it look like an
 * attachment.
 *
 * Duration overlays the frame the way it does in every player anyone has used,
 * which frees the text column to carry only title and author.
 */
export function MediaPreview({ metadata }: { metadata: VideoMetadata }) {
  const host = formatHost(metadata.webpageUrl);

  return (
    <Card padded={false} className="flex gap-5 overflow-hidden max-md:flex-col max-md:gap-0">
      <div className="relative aspect-video w-64 shrink-0 bg-inset max-lg:w-52 max-md:w-full">
        {metadata.thumbnailUrl && (
          <img src={metadata.thumbnailUrl} alt="" className="size-full object-cover" />
        )}
        {metadata.duration !== undefined && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/72 px-1.5 py-0.5 font-mono text-2xs tabular-nums text-white">
            {formatDuration(metadata.duration)}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-center gap-2 py-5 pr-5 max-md:px-5">
        <h2 className="line-clamp-2 text-lg font-semibold leading-snug tracking-[-0.015em] text-ink">
          {metadata.title}
        </h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-base text-ink-3">
          {metadata.uploader && (
            <span className="inline-flex min-w-0 items-center gap-2">
              <User className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{metadata.uploader}</span>
            </span>
          )}
          {/* Where it actually resolved to — shortened links don't always land
              where they were copied from. */}
          {host && (
            <span className="inline-flex min-w-0 items-center gap-2">
              <Globe className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate font-mono text-sm">{host}</span>
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
