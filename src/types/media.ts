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
}
