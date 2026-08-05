import { History, Play, FolderOpen, RotateCcw, Check, AlertTriangle, X } from "lucide-react";
import { motion } from "motion/react";
import { EmptyState } from "@/components/common/EmptyState";
import { useHistory } from "@/hooks/useHistory";
import { formatDate } from "@/lib/formatters";
import { EASE } from "@/lib/motion";
import type { DownloadHistoryItem } from "@/types/download";

const STATUS_ICON = {
  completed: { icon: Check, className: "text-primary" },
  failed: { icon: AlertTriangle, className: "text-error" },
  cancelled: { icon: X, className: "text-on-surface-variant" },
} as const;

function iconButton(label: string, Icon: typeof Play, onClick: () => void) {
  return (
    <button
      key={label}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
    >
      <Icon className="size-4" strokeWidth={1.5} />
    </button>
  );
}

// Rows the same height as the real ones, so the list doesn't jump when the
// history arrives from disk (PLAN §55).
function Skeleton() {
  return (
    <div
      className="overflow-hidden rounded-sm border border-outline-variant"
      aria-busy="true"
      aria-label="Loading history"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-outline-variant bg-surface-container-low px-4 py-3 last:border-b-0 odd:bg-surface-container-lowest"
        >
          <div className="size-4 shrink-0 animate-pulse rounded-full bg-surface-container-high" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-surface-container-high" />
            <div className="h-2.5 w-1/4 animate-pulse rounded bg-surface-container-high" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HistoryPage() {
  const { history, isLoading, open, showInFolder, retry, remove } = useHistory();

  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col px-8 py-16">
      <div className="mb-10">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="font-display text-[2.75rem] font-semibold leading-[1.1] tracking-tight text-on-surface"
        >
          History
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15, ease: EASE }}
          className="mt-3 text-sm text-on-surface-variant"
        >
          Previously downloaded media.
        </motion.p>
      </div>

      {isLoading ? (
        <Skeleton />
      ) : history.length === 0 ? (
        <EmptyState icon={History} title="No history yet" description="Completed downloads will appear here." />
      ) : (
        <div className="overflow-hidden rounded-sm border border-outline-variant">
          {history.map((item: DownloadHistoryItem) => {
            const { icon: StatusIcon, className } = STATUS_ICON[item.status];
            return (
              <div
                key={item.id}
                data-menu="history"
                data-menu-id={item.id}
                className="flex items-center gap-4 border-b border-outline-variant bg-surface-container-low px-4 py-3 last:border-b-0 odd:bg-surface-container-lowest"
              >
                <StatusIcon className={`size-4 shrink-0 ${className}`} strokeWidth={2} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-on-surface">{item.title}</p>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-on-surface-variant">
                    {item.format}
                    {item.quality ? ` · ${item.quality}` : ""} · {formatDate(item.completedAt ?? item.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {item.status === "completed" && iconButton("Open file", Play, () => open(item.filePath))}
                  {item.status === "completed" &&
                    iconButton("Show in folder", FolderOpen, () => showInFolder(item.filePath))}
                  {iconButton("Download again", RotateCcw, () => retry(item))}
                  {iconButton("Remove from history", X, () => remove(item.id))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
