import { X } from "lucide-react";
import { motion } from "motion/react";
import type { DownloadItem } from "@/types/download";
import { DownloadCard } from "./DownloadCard";
import { DownloadStatus } from "./DownloadStatus";
import { staggerContainer, staggerItem } from "@/lib/motion";

interface DownloadQueueProps {
  active: DownloadItem[];
  queued: DownloadItem[];
  finished: DownloadItem[];
  onOpen: (filePath?: string) => void;
  onReveal?: (filePath?: string) => void;
  onCancel?: (id: string) => void;
}

export function DownloadQueue({
  active,
  queued,
  finished,
  onOpen,
  onReveal,
  onCancel,
}: DownloadQueueProps) {
  return (
    <div className="flex flex-col gap-8">
      {active.length > 0 && (
        <section className="flex flex-col gap-3">
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
        </section>
      )}

      {queued.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            Queued · {queued.length}
          </h2>
          <div className="rounded-sm border border-outline-variant bg-surface-container-low">
            {queued.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-on-surface">{item.title ?? item.url}</p>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-on-surface-variant">
                    {item.format}
                    {item.quality ? ` · ${item.quality}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <DownloadStatus status={item.status} />
                  {onCancel && (
                    <button
                      onClick={() => onCancel(item.id)}
                      aria-label="Remove from queue"
                      className="rounded p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    >
                      <X className="size-4" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section className="flex flex-col gap-3">
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
                <DownloadCard item={item} onOpen={onOpen} onReveal={onReveal} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}
    </div>
  );
}
