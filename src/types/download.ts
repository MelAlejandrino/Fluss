import type { DownloadFormat, VideoQuality } from "./media";

// No "analyzing" — an item is either enqueued straight from a URL (bulk) or
// after Home's preview step (single); either way it starts at "queued".
export type DownloadStatus =
  | "queued"
  | "downloading"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/// Marks the downloads that came from one playlist, so the queue can show them
/// as a block and cancel them together. The id is generated per enqueue rather
/// than taken from the site: two batches of the same playlist are two blocks.
export interface PlaylistRef {
  id: string;
  title: string;
  /**
   * How many videos the playlist put in the queue.
   *
   * Recorded here rather than counted from the queue, because the queue only
   * persists what's unfinished: after a restart the completed members are gone
   * from it, and counting rows would report a twelve-video playlist as "0 of 6".
   */
  total: number;
}

export interface DownloadItem {
  id: string;
  url: string;
  title?: string;
  thumbnailUrl?: string;
  format: DownloadFormat;
  quality?: VideoQuality;
  outputDirectory: string;
  /** Title from a previous attempt, used to restore partial files on retry. */
  previousTitle?: string;
  /** Set when this came from a playlist, not a single link. */
  playlist?: PlaylistRef;
  /**
   * Its position in that playlist, from zero.
   *
   * Timestamps can't stand in for this: a playlist enqueues every video inside
   * the same millisecond, so `createdAt` ties across the whole batch and sorting
   * by it leaves whatever order the list happened to be in.
   */
  playlistIndex?: number;
  status: DownloadStatus;
  progress: number;
  downloadedBytes?: number;
  totalBytes?: number;
  speed?: number;
  eta?: number;
  filePath?: string;
  /**
   * The file this download produced is no longer on disk.
   *
   * Set by checking against the filesystem, and cleared the same way — deleting
   * a folder doesn't tell the app anything, and a "completed" row whose file
   * has gone is a row that lies about what you have.
   */
  fileMissing?: boolean;
  /**
   * Completed without fetching anything — the file was already in the folder.
   *
   * Worth saying out loud. Re-queueing a playlist you mostly have finishes in
   * seconds with no progress bar and no bytes, which reads as a broken download
   * rather than the correct outcome it is.
   */
  alreadyExisted?: boolean;
  /** Friendly, user-facing failure reason. */
  error?: string;
  /** Raw engine output, shown only behind "View details". */
  errorDetails?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DownloadHistoryItem {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  filePath?: string;
  /** The file is no longer on disk — checked against the filesystem. */
  fileMissing?: boolean;
  format: DownloadFormat;
  quality?: VideoQuality;
  outputDirectory: string; // kept so Retry re-downloads to the same place
  /** Set when this came from a playlist, so history can show it as one. */
  playlist?: PlaylistRef;
  /** Its position in that playlist, from zero. */
  playlistIndex?: number;
  status: "completed" | "failed" | "cancelled";
  createdAt: string;
  completedAt?: string;
}

export interface DownloadProgressEvent {
  downloadId: string;
  progress: number;
  downloadedBytes?: number;
  totalBytes?: number;
  speed?: number;
  eta?: number;
  status: string;
}

/** Fired once per download when yt-dlp resolves metadata, before bytes move. */
export interface DownloadMetaEvent {
  downloadId: string;
  title: string;
  thumbnailUrl?: string;
}

export interface DownloadCardProps {
  item: DownloadItem;
  onOpen: (filePath?: string) => void;
  onReveal?: (filePath?: string) => void;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
}
