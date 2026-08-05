import { X } from "lucide-react";
import { motion } from "motion/react";
import type { DownloadItem } from "@/types/download";
import { DownloadCard } from "./DownloadCard";
import { DownloadStatus } from "./DownloadStatus";
import { Thumbnail } from "./Thumbnail";
import { staggerContainer, staggerItem, EASE } from "@/lib/motion";

interface DownloadQueueProps {
  active: DownloadItem[];
  queued: DownloadItem[];
  finished: DownloadItem[];
  onOpen: (filePath?: string) => void;
  onReveal?: (filePath?: string) => void;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
}

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
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="flex flex-col gap-4"
        >
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            Downloading
          </h2>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-3"
          >
            {active.map((item) => (
              <motion.div key={item.id} variants={staggerItem}>
                <DownloadCard item={item} onOpen={onOpen} onReveal={onReveal} onCancel={onCancel} />
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      )}

      {queued.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: active.length > 0 ? 0.1 : 0, ease: EASE }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Queued
            </h2>
            <span className="font-mono text-xs text-on-surface-variant/70">
              {queued.length} item{queued.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="rounded-sm border border-outline-variant bg-surface-container-lowest">
            {queued.map((item) => (
              <div
                key={item.id}
                data-menu="download"
                data-menu-id={item.id}
                className="flex items-center justify-between gap-4 border-b border-outline-variant px-4 py-3.5 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <Thumbnail src={item.thumbnailUrl} className="w-16" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-on-surface">{item.title ?? item.url}</p>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-on-surface-variant">
                      {item.format}
                      {item.quality ? ` · ${item.quality}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <DownloadStatus status={item.status} />
                  {onCancel && (
                    <button
                      onClick={() => onCancel(item.id)}
                      aria-label="Remove from queue"
                      className="rounded-sm p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                    >
                      <X className="size-4" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {finished.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: EASE }}
          className="flex flex-col gap-4"
        >
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            Recent
          </h2>
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
        </motion.section>
      )}
    </div>
  );
}
