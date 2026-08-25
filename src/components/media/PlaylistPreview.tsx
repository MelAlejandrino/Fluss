import { ListVideo, User } from "lucide-react";
import type { PlaylistMetadata } from "@/types/media";
import { formatDuration } from "@/lib/formatters";
import { Card, CardHeader, Well } from "@/components/ui/Card";

/**
 * What a playlist link resolved to, before anything is queued. The count is
 * the headline — it's the number of files about to appear on disk, and the
 * only figure worth checking twice before committing.
 *
 * Titles are listed rather than summarised: a playlist URL is easy to mistake
 * for a different one, and the first few rows settle it at a glance. The list
 * scrolls rather than growing, so the Download button below never leaves the
 * window no matter how long the playlist is.
 */
export function PlaylistPreview({ playlist }: { playlist: PlaylistMetadata }) {
  const count = playlist.entries.length;
  // Flat listings don't always carry durations; sum what's there and say
  // nothing when there's nothing to say, rather than showing a wrong total.
  const runtime = playlist.entries.reduce((total, entry) => total + (entry.duration ?? 0), 0);
  const label = `${count} video${count === 1 ? "" : "s"}`;

  return (
    <Card>
      <CardHeader
        title={playlist.title}
        meta={runtime > 0 ? `${label} · ${formatDuration(runtime)}` : label}
        actions={
          playlist.uploader && (
            <span className="inline-flex min-w-0 items-center gap-2 text-base text-ink-3">
              <User className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{playlist.uploader}</span>
            </span>
          )
        }
      />

      {count === 0 ? (
        <p className="flex items-center gap-2.5 text-base text-ink-3">
          <ListVideo className="size-4 shrink-0" strokeWidth={1.75} />
          Nothing downloadable in this list.
        </p>
      ) : (
        <Well className="max-h-[38vh] overflow-y-auto">
          <ol className="divide-y divide-line">
            {playlist.entries.map((entry, i) => (
              <li key={`${entry.url}-${i}`} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-ink-3">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-base text-ink-2">{entry.title}</span>
                {entry.duration !== undefined && (
                  <span className="shrink-0 font-mono text-2xs tabular-nums text-ink-3">
                    {formatDuration(entry.duration)}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </Well>
      )}
    </Card>
  );
}
