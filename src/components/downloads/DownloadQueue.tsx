import { X } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { DownloadItem } from "@/types/download";
import { DownloadCard } from "./DownloadCard";
import { DownloadStatus } from "./DownloadStatus";
import { Thumbnail } from "./Thumbnail";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { staggerContainer, staggerItem, rise } from "@/lib/motion";

interface DownloadQueueProps {
  active: DownloadItem[];
  queued: DownloadItem[];
  finished: DownloadItem[];
  onOpen: (filePath?: string) => void;
  onReveal?: (filePath?: string) => void;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
}

/**
 * A titled band of the queue. Section headings are sentence-case and sized
 * one step under the page title — they orient, they don't compete.
 */
function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <motion.section variants={rise} initial="hidden" animate="show" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-md font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {meta && <span className="font-mono text-xs tabular-nums text-ink-3">{meta}</span>}
      </div>
      {children}
    </motion.section>
  );
}

/**
 * The queue, in three bands: what's running, what's waiting, what's done.
 *
 * Running and finished items get full cards because there's something to read
 * or act on. Waiting ones get compact rows in a single container — a queue of
 * fifteen identical cards is a wall, and none of them have anything to say yet.
 */
export function DownloadQueue({
  active,
  queued,
  finished,
  onOpen,
  onReveal,
  onCancel,
  onRetry,
}: DownloadQueueProps) {
  return (
    <div className="flex flex-col gap-10">
      {active.length > 0 && (
        <Section title="Downloading">
          <div className="flex flex-col gap-3">
            {active.map((item) => (
              <DownloadCard
                key={item.id}
                item={item}
                onOpen={onOpen}
                onReveal={onReveal}
                onCancel={onCancel}
              />
            ))}
          </div>
        </Section>
      )}

      {queued.length > 0 && (
        <Section title="Queued" meta={`${queued.length} item${queued.length === 1 ? "" : "s"}`}>
          <div className="overflow-hidden rounded-xl border border-line bg-card shadow-card">
            {queued.map((item, i) => (
              <div
                key={item.id}
                data-menu="download"
                data-menu-id={item.id}
                className="flex items-center gap-4 border-t border-line px-4 py-3 transition-colors duration-150 first:border-t-0 hover:bg-hover"
              >
                <span className="w-4 shrink-0 text-right font-mono text-xs tabular-nums text-ink-3">
                  {i + 1}
                </span>
                <Thumbnail src={item.thumbnailUrl} className="w-16" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate text-base font-medium text-ink">
                    {item.title ?? item.url}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge mono>{item.format.toUpperCase()}</Badge>
                    {item.quality && <Badge mono>{item.quality}</Badge>}
                  </div>
                </div>
                <DownloadStatus status={item.status} />
                {onCancel && (
                  <IconButton
                    label="Remove from queue"
                    tone="danger"
                    onClick={() => onCancel(item.id)}
                  >
                    <X strokeWidth={1.75} />
                  </IconButton>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {finished.length > 0 && (
        <Section title="Recent">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-3"
          >
            {finished.map((item) => (
              <motion.div key={item.id} variants={staggerItem}>
                <DownloadCard item={item} onOpen={onOpen} onReveal={onReveal} onRetry={onRetry} />
              </motion.div>
            ))}
          </motion.div>
        </Section>
      )}
    </div>
  );
}
