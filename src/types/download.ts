import type { DownloadFormat, VideoQuality } from "./media";

// No "analyzing" — analysis happens on Home before an item is ever enqueued.
export type DownloadStatus =
  | "queued"
  | "downloading"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface DownloadItem {
  id: string;
  url: string;
  title?: string;
  thumbnailUrl?: string;
  format: DownloadFormat;
  quality?: VideoQuality;
  outputDirectory: string;
  status: DownloadStatus;
  progress: number;
  downloadedBytes?: number;
  totalBytes?: number;
  speed?: number;
  eta?: number;
  filePath?: string;
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
  format: DownloadFormat;
  quality?: VideoQuality;
  outputDirectory: string; // kept so Retry re-downloads to the same place
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

export interface DownloadCardProps {
  item: DownloadItem;
  onOpen: (filePath?: string) => void;
  onReveal?: (filePath?: string) => void;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
}
