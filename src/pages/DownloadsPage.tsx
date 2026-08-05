import { Download, Play } from "lucide-react";
import { motion } from "motion/react";
import { DownloadQueue } from "@/components/downloads/DownloadQueue";
import { EmptyState } from "@/components/common/EmptyState";
import { useDownloads } from "@/hooks/useDownloads";
import { startQueue } from "@/lib/downloadManager";
import { EASE } from "@/lib/motion";

export function DownloadsPage() {
  const { active, queued, finished, open, reveal, cancel, retry } = useDownloads();
  const isEmpty = active.length === 0 && queued.length === 0 && finished.length === 0;
  const canStart = active.length === 0 && queued.length > 0;

  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col px-8 py-16">
      <div className="mb-10 flex items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="font-display text-[2.75rem] font-semibold leading-[1.1] tracking-tight text-on-surface"
          >
            Downloads
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15, ease: EASE }}
            className="text-sm text-on-surface-variant"
          >
            Active and queued downloads.
          </motion.p>
        </div>
        {canStart && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            onClick={startQueue}
            className="inline-flex shrink-0 items-center gap-2 rounded-sm bg-primary px-5 py-2.5 text-sm font-medium tracking-wide text-on-primary transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Play className="size-4" strokeWidth={1.5} />
            Start queue
          </motion.button>
        )}
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Download}
          title="No downloads yet"
          description="Paste a URL on the Home page to start downloading."
        />
      ) : (
        <DownloadQueue
          active={active}
          queued={queued}
          finished={finished}
          onOpen={open}
          onReveal={reveal}
          onCancel={cancel}
          onRetry={retry}
        />
      )}
    </div>
  );
}
