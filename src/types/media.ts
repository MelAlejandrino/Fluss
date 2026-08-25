export interface VideoMetadata {
  id: string;
  title: string;
  thumbnailUrl?: string;
  duration?: number;
  uploader?: string;
  webpageUrl: string;
  availableQualities: number[];
}

export type DownloadFormat = "mp4" | "mp3";

export type VideoQuality = "best" | `${number}p`;

export interface DownloadOptions {
  url: string;
  outputDirectory: string;
  format: DownloadFormat;
  quality?: VideoQuality;
  overwrite?: boolean;
  keepPartial?: boolean;
  /** Title from a previous attempt, used to restore partial files on retry. */
  previousTitle?: string;
  /** Title as the queue knows it, so a partial can be found without a retry. */
  title?: string;
}

export interface PlaylistEntry {
  url: string;
  title: string;
  duration?: number;
}

export interface PlaylistMetadata {
  title: string;
  uploader?: string;
  webpageUrl: string;
  entries: PlaylistEntry[];
}

/** What `analyze_url` returns: one video, or a list of them. */
export type Analysis = VideoMetadata | PlaylistMetadata;
