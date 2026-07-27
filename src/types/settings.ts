export type Theme = "system" | "light" | "dark";

export interface Settings {
  defaultDownloadDirectory: string;
  autoStartDownloads: boolean;
  desktopNotifications: boolean;
  concurrentDownloads: number;
  overwriteExisting: boolean;
  keepPartialFiles: boolean;
  theme: Theme;
}

export interface EngineVersions {
  ytDlp: string;
  ffmpeg: string;
}
