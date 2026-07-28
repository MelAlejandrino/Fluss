import { useDownloadStore } from "@/stores/downloadStore";
import { useUiStore } from "@/stores/uiStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { api } from "@/lib/api";
import { CANCELLED, friendlyError, errorDetails, ANALYZE_FALLBACK } from "@/lib/errors";
import { notify } from "@/lib/toast";
import type { DownloadItem } from "@/types/download";
import type { DownloadFormat, VideoQuality } from "@/types/media";

export interface EnqueueInput {
  url: string;
  title?: string;
  thumbnailUrl?: string;
  format: DownloadFormat;
  quality: VideoQuality;
  outputDirectory: string;
}

/// The next download to start: nothing if one is already active, else the
/// oldest queued item. Pure — the store prepends, so oldest is last.
export function nextToStart(downloads: DownloadItem[]): DownloadItem | null {
  const active = downloads.some((d) => d.status === "downloading" || d.status === "processing");
  if (active) return null;
  const queued = downloads.filter((d) => d.status === "queued");
  return queued.length ? queued[queued.length - 1] : null;
}

export function enqueue(input: EnqueueInput) {
  if (!input.outputDirectory) {
    notify(
      "No download folder selected. Choose one in Settings or pick a folder.",
      "error",
    );
    return;
  }

  const id = crypto.randomUUID();
  useDownloadStore.getState().add({
    id,
    url: input.url,
    title: input.title,
    thumbnailUrl: input.thumbnailUrl,
    format: input.format,
    quality: input.quality,
    outputDirectory: input.outputDirectory,
    status: "queued",
    progress: 0,
    createdAt: new Date().toISOString(),
  });
  useUiStore.getState().navigate("downloads");
  // "Start downloads automatically" off → leave it queued for a manual Start.
  if (useSettingsStore.getState().settings.autoStartDownloads) {
    processQueue();
  }
  // After processQueue, so whatever just started is skipped — it gets its
  // metadata from the download itself.
  void prefetchMetadata();
}

/// Manually kick the queue (Start button when auto-start is off).
export function startQueue() {
  processQueue();
}

// Bulk enqueues bare URLs, so queued items have no title or thumbnail until
// their own download starts. This resolves them ahead of time — and surfaces a
// dead link immediately instead of letting it sit in the queue looking fine
// until its turn comes. Strictly one analysis at a time so it never crowds the
// download itself.
let prefetching = false;

async function prefetchMetadata() {
  if (prefetching) return;
  prefetching = true;
  try {
    for (;;) {
      // Re-read each pass: enqueue keeps adding while this runs. Every branch
      // below either sets a title or moves the item out of "queued", so a
      // failure can't put this loop in a spin.
      const pending = useDownloadStore
        .getState()
        .downloads.find((d) => d.status === "queued" && !d.title);
      if (!pending) return;

      try {
        const meta = await api.analyzeUrl(pending.url);
        // It may have started, finished, or been removed while we waited.
        const current = useDownloadStore.getState().downloads.find((d) => d.id === pending.id);
        if (current && !current.title) {
          useDownloadStore.getState().update(pending.id, {
            title: meta.title,
            thumbnailUrl: meta.thumbnailUrl,
          });
        }
      } catch (err) {
        const current = useDownloadStore.getState().downloads.find((d) => d.id === pending.id);
        // Only fail it if it's *still* waiting. If it started downloading while
        // we were analyzing, that process owns the outcome — overwriting its
        // status here would kill a download that may well succeed.
        if (current?.status !== "queued") continue;
        const raw = typeof err === "string" ? err : String(err);
        useDownloadStore.getState().update(pending.id, {
          status: "failed",
          error: friendlyError(raw, ANALYZE_FALLBACK),
          errorDetails: errorDetails(raw),
        });
        recordHistory(current, "failed");
        // No toast: a bulk paste with several dead links would fire one per
        // link. The card carries the reason, on the page enqueue just opened.
      }
    }
  } finally {
    prefetching = false;
  }
}

export function cancel(id: string) {
  const store = useDownloadStore.getState();
  const item = store.downloads.find((d) => d.id === id);
  if (!item) return;
  if (item.status === "queued") {
    store.remove(id); // not started yet — just drop it
  } else if (item.status === "downloading" || item.status === "processing") {
    api.cancelDownload(id).catch(() => {}); // kill → promise rejects → advances queue
  }
}

// One active download at a time (PLAN §19). Called on enqueue and whenever a
// download settles.
function processQueue() {
  const store = useDownloadStore.getState();
  const next = nextToStart(store.downloads);
  if (!next) return;

  store.update(next.id, { status: "downloading" });
  const settings = useSettingsStore.getState().settings;
  api
    .startDownload(next.id, {
      url: next.url,
      outputDirectory: next.outputDirectory,
      format: next.format,
      quality: next.quality,
      overwrite: settings.overwriteExisting,
      keepPartial: settings.keepPartialFiles,
    })
    .then(({ filePath }) => {
      store.update(next.id, {
        status: "completed",
        progress: 1,
        filePath,
        completedAt: new Date().toISOString(),
      });
      recordHistory(next, "completed", filePath);
      const label = next.title ?? next.url;
      notify(`Downloaded “${label}”`, "success");
      announce("Download complete", `${label}\n${describe(next)}`);
    })
    .catch((err) => {
      const raw = typeof err === "string" ? err : String(err);
      if (raw === CANCELLED) {
        store.update(next.id, { status: "cancelled" });
        recordHistory(next, "cancelled");
        return;
      }
      // Store the friendly reason for the card and the raw text for "View
      // details" — the UI must never lead with engine stderr (PLAN §26).
      store.update(next.id, {
        status: "failed",
        error: friendlyError(raw),
        errorDetails: errorDetails(raw),
      });
      recordHistory(next, "failed");
      notify(friendlyError(raw), "error");
      announce("Download failed", next.title ?? next.url);
    })
    .finally(processQueue);
}

/// Retry a download that failed or was cancelled: re-queue it as a fresh item.
export function retry(id: string) {
  const store = useDownloadStore.getState();
  const item = store.downloads.find((d) => d.id === id);
  if (!item) return;
  store.remove(id);
  enqueue({
    url: item.url,
    title: item.title,
    thumbnailUrl: item.thumbnailUrl,
    format: item.format,
    quality: item.quality ?? "best",
    outputDirectory: item.outputDirectory,
  });
}

function describe(item: DownloadItem) {
  return item.quality && item.format !== "mp3"
    ? `${item.quality} ${item.format.toUpperCase()}`
    : item.format.toUpperCase();
}

/// OS-level notification, gated on the user's setting.
function announce(title: string, body: string) {
  if (!useSettingsStore.getState().settings.desktopNotifications) return;
  api.notifyDesktop(title, body).catch(() => {}); // best-effort; toast already shown
}

function recordHistory(
  item: DownloadItem,
  status: "completed" | "failed" | "cancelled",
  filePath?: string,
) {
  useHistoryStore.getState().add({
    id: item.id,
    title: item.title ?? item.url,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl,
    filePath,
    format: item.format,
    quality: item.quality,
    outputDirectory: item.outputDirectory,
    status,
    createdAt: item.createdAt,
    completedAt: new Date().toISOString(),
  });
}
