import { Download, Play } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DownloadQueue } from "@/components/downloads/DownloadQueue";
import { EmptyState } from "@/components/common/EmptyState";
import { useDownloads } from "@/hooks/useDownloads";
import { startQueue } from "@/lib/downloadManager";

export function DownloadsPage() {
  const { active, queued, finished, open, reveal, cancel } = useDownloads();
  const isEmpty = active.length === 0 && queued.length === 0 && finished.length === 0;
  const canStart = active.length === 0 && queued.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <div className="flex items-start justify-between">
        <PageHeader title="Downloads" description="Active and queued downloads." />
        {canStart && (
          <button
            onClick={startQueue}
            className="inline-flex shrink-0 items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Play className="size-4" strokeWidth={1.5} />
            Start
          </button>
        )}
      </div>
      {isEmpty ? (
        <EmptyState
          icon={Download}
          title="No active downloads"
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
        />
      )}
    </div>
  );
}
