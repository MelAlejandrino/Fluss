import { useDownloadStore, restoredQueue } from "@/stores/downloadStore";
import { useUiStore } from "@/stores/uiStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { api } from "@/lib/api";
import { isPlaylist } from "@/lib/analysis";
import { CANCELLED, friendlyError, errorDetails, ANALYZE_FALLBACK } from "@/lib/errors";
import { notify } from "@/lib/toast";
import type { DownloadItem, DownloadHistoryItem, PlaylistRef } from "@/types/download";
import { isPending, isUnfinished, byPlaylistOrder } from "@/lib/downloadGroups";
import type { DownloadFormat, VideoQuality } from "@/types/media";

export interface EnqueueInput {
  url: string;
  title?: string;
  thumbnailUrl?: string;
  format: DownloadFormat;
  quality: VideoQuality;
  outputDirectory: string;
  /** Title from a previous attempt, used to restore partial files on retry. */
  previousTitle?: string;
  /** Set when this came from a playlist, not a single link. */
  playlist?: PlaylistRef;
  /** Its position in that playlist, from zero. */
  playlistIndex?: number;
  /**
   * When it first joined the queue. Carried over by a retry so a playlist keeps
   * its own order: a resume enqueues its videos in the same millisecond, and
   * fresh timestamps would leave nothing to sort them by.
   */
  createdAt?: string;
}

/// The next download to start: nothing if one is already active, else the
/// oldest queued item. Pure — the store prepends, so oldest is last.
export function nextToStart(downloads: DownloadItem[]): DownloadItem | null {
  const active = downloads.some((d) => d.status === "downloading" || d.status === "processing");
  if (active) return null;
  const queued = downloads.filter((d) => d.status === "queued");
  return queued.length ? queued[queued.length - 1] : null;
}

/// What makes two queue entries the same download: same link, same settings,
/// same destination. A different quality or folder is a different file, so it
/// is not a duplicate.
function identity(item: {
  url: string;
  format: string;
  quality?: string;
  outputDirectory: string;
}): string {
  return [item.url, item.format, item.quality ?? "", item.outputDirectory].join("\u0000");
}

export function enqueue(input: EnqueueInput) {
  enqueueMany([input]);
}

/// Queue a batch as one operation.
///
/// A playlist is not always twelve videos — a channel's uploads or a YouTube
/// Mix can be thousands. Adding them one at a time meant a store update and a
/// full rewrite of `queue.json` per video, each write carrying every item added
/// so far: quadratic work on the UI thread, with the window locked for as long
/// as it took. One update, one write.
export function enqueueMany(inputs: EnqueueInput[]) {
  const withDirectory = inputs.filter((input) => input.outputDirectory);
  if (withDirectory.length !== inputs.length) {
    notify("No download folder selected. Choose one in Settings or pick a folder.", "error");
  }
  if (!withDirectory.length) return;

  // The same video queued twice writes to the same filename: the second run
  // finds the first one's file, reports "already downloaded", and records a
  // success that fetched nothing. Only *pending* items count — re-downloading
  // something that already finished is a legitimate thing to ask for.
  const pending = useDownloadStore.getState().downloads.filter(isPending);
  const seen = new Set(pending.map(identity));
  const wanted = withDirectory.filter((input) => {
    const key = identity(input);
    if (seen.has(key)) return false;
    seen.add(key); // also collapses duplicates inside this very batch
    return true;
  });
  if (!wanted.length) {
    notify("Already in the queue.", "info");
    return;
  }

  const now = new Date().toISOString();
  useDownloadStore.getState().addMany(
    // Reversed, because the store keeps newest first and the queue runs from
    // the tail: this leaves the batch in its own order.
    [...wanted].reverse().map((input) => ({
      id: crypto.randomUUID(),
      url: input.url,
      title: input.title,
      thumbnailUrl: input.thumbnailUrl,
      format: input.format,
      quality: input.quality,
      outputDirectory: input.outputDirectory,
      previousTitle: input.previousTitle,
      playlist: input.playlist,
      playlistIndex: input.playlistIndex,
      status: "queued" as const,
      progress: 0,
      createdAt: input.createdAt ?? now,
    })),
  );
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

/// Read last session's unfinished queue back in and pick up where it stopped.
///
/// Runs once at start. Anything that was mid-download comes back as queued —
/// with its id intact, so the engine finds the half-downloaded file it left in
/// its own scratch directory and continues rather than starting the video over.
export async function restoreQueue() {
  let stored;
  try {
    stored = await api.getQueue();
  } catch {
    return; // no saved queue, or an unreadable one — start empty, quietly
  }
  const items = restoredQueue(stored);
  if (!items.length) return;

  // Never on top of a live queue: a download started in the seconds before this
  // resolved would be duplicated by the restore.
  if (useDownloadStore.getState().downloads.length) return;
  useDownloadStore.getState().restore(items);

  const settings = useSettingsStore.getState();
  // Settings may still be in flight; wait for the real value rather than
  // resuming against the default and ignoring someone's "don't auto-start".
  if (!settings.loaded) await settings.load().catch(() => {});
  if (useSettingsStore.getState().settings.autoStartDownloads) processQueue();
  void prefetchMetadata();
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
        // ponytail: a playlist link pasted into *bulk* stays one row — it keeps
        // its title and downloads as yt-dlp sees fit. Single mode is where a
        // playlist gets expanded into one row per video.
        const thumbnailUrl = isPlaylist(meta) ? undefined : meta.thumbnailUrl;
        // It may have started, finished, or been removed while we waited.
        const current = useDownloadStore.getState().downloads.find((d) => d.id === pending.id);
        if (current && !current.title) {
          useDownloadStore.getState().update(pending.id, {
            // Falls back to the URL: this loop picks the next queued item
            // *without* a title, so an empty one would hand it the same item
            // forever, re-analyzing in a tight loop.
            title: meta.title || pending.url,
            thumbnailUrl,
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

/// Cancel a whole playlist: the running one is killed, the waiting ones are
/// marked cancelled.
///
/// Marked, not deleted. Dropping one item from the queue by hand means you
/// don't want it; stopping a playlist means you're stopping *now* — and the
/// twenty videos that never got their turn are the whole point of resuming
/// later. Deleting them left nothing to come back to.
export function cancelGroup(playlistId: string) {
  const store = useDownloadStore.getState();
  const mine = store.downloads.filter((d) => d.playlist?.id === playlistId && isPending(d));

  // The waiting ones first, and synchronously: killing the running download
  // resolves its promise, which starts whatever is still queued.
  const waiting = mine.filter((d) => d.status === "queued");
  waiting.forEach((item) => store.update(item.id, { status: "cancelled" }));
  useHistoryStore.getState().addMany(waiting.map((item) => historyEntry(item, "cancelled")));

  mine
    .filter((d) => d.status !== "queued")
    .forEach((item) => api.cancelDownload(item.id).catch(() => {}));
}

/// Put every unfinished video of a playlist back in the queue.
///
/// Cancelling thirty videos takes one click; without this, getting them back
/// takes thirty — and the queue starts the next one between each, so you are
/// racing it. Order is preserved: oldest first, so the playlist resumes in the
/// order it was in.
export function retryGroup(playlistId: string) {
  const unfinished = useDownloadStore
    .getState()
    .downloads.filter((d) => d.playlist?.id === playlistId && isUnfinished(d));

  // Explicitly in playlist order. Reversing the store happened to work only
  // while nothing had been re-queued before; once it had, the video holding a
  // half-downloaded file could land last in the queue.
  byPlaylistOrder(unfinished)
    .map((d) => d.id)
    .forEach(retry);
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
      previousTitle: next.previousTitle,
      // Both titles: a retry knows the name the partial was written under, and
      // a first attempt on a playlist item already knows its title from the
      // listing. Either is enough for the engine to find a partial in the folder.
      title: next.title,
    })
    .then(({ filePath, alreadyExisted }) => {
      store.update(next.id, {
        status: "completed",
        progress: 1,
        filePath,
        alreadyExisted,
        completedAt: new Date().toISOString(),
      });
      recordHistory(next, "completed", filePath);
      const label = next.title ?? next.url;
      if (next.playlist) {
        // Nothing per video. The queue is already showing each one land, and a
        // playlist speaks once — when it's done.
        const progress = playlistProgress(next.playlist);
        if (!progress.pending) announcePlaylistFinished(next.playlist, progress);
      } else if (alreadyExisted) {
        // Says what happened rather than claiming a download that never ran.
        // No OS notification: nothing was fetched, so there's nothing to
        // interrupt anyone about.
        notify(`“${label}” was already in that folder`, "info");
      } else {
        notify(`Downloaded “${label}”`, "success");
        announce("Download complete", `${label}\n${describe(next)}`);
      }
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
      if (next.playlist) {
        // Quiet here too. The row carries the reason, and the summary at the
        // end says how many of them there were.
        const progress = playlistProgress(next.playlist);
        if (!progress.pending) announcePlaylistFinished(next.playlist, progress);
      } else {
        notify(friendlyError(raw), "error");
        announce("Download failed", next.title ?? next.url);
      }
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
    previousTitle: item.title,
    playlist: item.playlist,
    playlistIndex: item.playlistIndex,
    createdAt: item.createdAt,
  });
}

/// How far along a playlist is, right now.
function playlistProgress(playlist: PlaylistRef) {
  const items = useDownloadStore
    .getState()
    .downloads.filter((d) => d.playlist?.id === playlist.id);
  // Same reasoning as the queue blocks: after a restart the store holds only
  // what was unfinished, so the playlist's own total is the honest denominator.
  const total = playlist.total || items.length;
  return {
    total,
    done: Math.max(0, total - items.filter((d) => d.status !== "completed").length),
    pending: items.some(isPending),
  };
}

/// The end of a playlist, announced once.
///
/// A toast and an OS notification are not the same thing and shouldn't follow
/// the same rule: a toast is gone in four seconds, while thirty OS
/// notifications sit in the notification centre until they're cleared by hand.
/// So every video gets a toast, and only the playlist gets a notification.
///
/// No per-video toast here — the summary replaces it, rather than firing twice
/// about the same video.
function announcePlaylistFinished(
  playlist: PlaylistRef,
  progress: { total: number; done: number },
) {
  const message = `“${playlist.title}” finished — ${progress.done} of ${progress.total} downloaded`;
  notify(message, progress.done === progress.total ? "success" : "info");
  announce("Playlist finished", message);
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
  useHistoryStore.getState().add(historyEntry(item, status, filePath));
}

/// The history record for a download, without writing it. Kept separate so a
/// cancelled playlist can record twenty of them in a single save.
function historyEntry(
  item: DownloadItem,
  status: "completed" | "failed" | "cancelled",
  filePath?: string,
): DownloadHistoryItem {
  return {
    id: item.id,
    title: item.title ?? item.url,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl,
    filePath,
    format: item.format,
    quality: item.quality,
    outputDirectory: item.outputDirectory,
    playlist: item.playlist,
    playlistIndex: item.playlistIndex,
    status,
    createdAt: item.createdAt,
    completedAt: new Date().toISOString(),
  };
}
