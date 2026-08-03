export type Theme = "system" | "light" | "dark";

export interface Settings {
  defaultDownloadDirectory: string;
  autoStartDownloads: boolean;
  desktopNotifications: boolean;
  concurrentDownloads: number;
  overwriteExisting: boolean;
  keepPartialFiles: boolean;
  /// Lets yt-dlp borrow the browser session so sites don't treat Fluss as a bot.
  /// Which browser is decided in src-tauri/src/settings.rs, not here — it's
  /// OS-dependent and not something a user should have to reason about.
  useBrowserCookies: boolean;
  minimizeToTray: boolean;
  theme: Theme;
}

/// Outcome of yt-dlp's self-update. `updated` false covers both "already
/// current" and "a package manager owns this install", which is why the message
/// comes from Rust rather than being built here.
export interface EngineUpdate {
  message: string;
  updated: boolean;
}

export interface EngineVersions {
  ytDlp: string;
  ffmpeg: string;
}
