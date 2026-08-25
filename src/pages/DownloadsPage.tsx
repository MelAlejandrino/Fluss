import { Inbox, Play, Plus } from "lucide-react";
import { DownloadQueue } from "@/components/downloads/DownloadQueue";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useDownloads } from "@/hooks/useDownloads";
import { useExpanded } from "@/hooks/useExpanded";
import { useUiStore } from "@/stores/uiStore";
import { startQueue } from "@/lib/downloadManager";

export function DownloadsPage() {
  const {
    active,
    queued,
    queuedGroups,
    finished,
    finishedGroups,
    open,
    reveal,
    cancel,
    cancelPlaylist,
    retry,
    retryPlaylist,
  } = useDownloads();
  const { isExpanded, toggle } = useExpanded();
  const newDownload = useUiStore((s) => s.newDownload);
  const isEmpty = active.length === 0 && queued.length === 0 && finished.length === 0;
  // Nothing is running but something is waiting — offer the manual kick.
  const canStart = active.length === 0 && queued.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-10 py-12 max-lg:px-7">
      <PageHeader
        title="Downloads"
        description="Everything running, waiting, and recently finished."
        actions={
          canStart && (
            <Button variant="primary" onClick={startQueue}>
              <Play />
              Start queue
            </Button>
          )
        }
      />

      {isEmpty ? (
        <EmptyState
          icon={Inbox}
          title="No downloads yet"
          description="Anything you queue shows up here with live progress, and stays until you clear it."
          action={
            <Button variant="primary" onClick={newDownload}>
              <Plus />
              New download
            </Button>
          }
        />
      ) : (
        <DownloadQueue
          active={active}
          queuedGroups={queuedGroups}
          finishedGroups={finishedGroups}
          onOpen={open}
          onReveal={reveal}
          onCancel={cancel}
          onCancelPlaylist={cancelPlaylist}
          onRetry={retry}
          onRetryPlaylist={retryPlaylist}
          isExpanded={isExpanded}
          onToggle={toggle}
        />
      )}
    </div>
  );
}
