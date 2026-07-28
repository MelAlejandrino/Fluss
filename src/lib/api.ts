import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { RELEASES_API } from "@/lib/appInfo";
import type { VideoMetadata, DownloadOptions } from "@/types/media";
import type { DownloadProgressEvent, DownloadHistoryItem } from "@/types/download";
import type { Settings, EngineVersions } from "@/types/settings";

export type ResizeDir =
  | "East"
  | "North"
  | "NorthEast"
  | "NorthWest"
  | "South"
  | "SouthEast"
  | "SouthWest"
  | "West";

interface LatestRelease {
  version: string;
  url: string;
}

interface DownloadResult {
  filePath: string;
}

// The single place `invoke`/Tauri APIs are touched. Everything else imports `api`.
export const api = {
  analyzeUrl(url: string) {
    return invoke<VideoMetadata>("analyze_url", { url });
  },

  startDownload(id: string, options: DownloadOptions) {
    return invoke<DownloadResult>("start_download", { id, options });
  },

  cancelDownload(id: string) {
    return invoke("cancel_download", { id });
  },

  onDownloadProgress(handler: (event: DownloadProgressEvent) => void) {
    return listen<DownloadProgressEvent>("download-progress", (e) => handler(e.payload));
  },

  async pickDirectory(defaultPath?: string): Promise<string | null> {
    const selected = await openDialog({ directory: true, multiple: false, defaultPath });
    return typeof selected === "string" ? selected : null;
  },

  appVersion() {
    return getVersion();
  },

  // Via the plugin, not navigator.clipboard — the web API is unreliable in
  // WebKitGTK, which is what Tauri uses on Linux.
  readClipboard() {
    return readText();
  },

  writeClipboard(text: string) {
    return writeText(text);
  },

  // Real OS notification (PLAN §38). Asks once, then stays quiet if declined —
  // the in-app toast still fires either way.
  async notifyDesktop(title: string, body: string) {
    let granted = await isPermissionGranted();
    if (!granted) granted = (await requestPermission()) === "granted";
    if (granted) sendNotification({ title, body });
  },

  openUrl(url: string) {
    return invoke("open_url", { url });
  },

  // Latest *published* GitHub release (drafts don't appear). null if none yet.
  async getLatestRelease(): Promise<LatestRelease | null> {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    return { version: String(data.tag_name).replace(/^v/, ""), url: String(data.html_url) };
  },

  openFile(path: string) {
    return invoke("open_file", { path });
  },

  revealInFolder(path: string) {
    return invoke("reveal_in_folder", { path });
  },

  getHistory() {
    return invoke<DownloadHistoryItem[]>("get_history");
  },

  saveHistory(items: DownloadHistoryItem[]) {
    return invoke("save_history", { items });
  },

  // Custom title-bar window controls (native decorations are off).
  windowMinimize() {
    return getCurrentWindow().minimize();
  },
  windowToggleMaximize() {
    return getCurrentWindow().toggleMaximize();
  },
  windowClose() {
    return getCurrentWindow().close();
  },
  windowIsMaximized() {
    return getCurrentWindow().isMaximized();
  },
  onWindowResized(handler: () => void) {
    return getCurrentWindow().onResized(() => handler());
  },
  startResizeDragging(direction: ResizeDir) {
    return getCurrentWindow().startResizeDragging(direction);
  },

  getSettings() {
    return invoke<Settings | null>("get_settings");
  },

  saveSettings(settings: Settings) {
    return invoke("save_settings", { settings });
  },

  defaultDownloadDir() {
    return invoke<string>("default_download_dir");
  },

  engineVersions() {
    return invoke<EngineVersions>("engine_versions");
  },

  hasActiveDownloads() {
    return invoke<boolean>("has_active_downloads");
  },

  forceCancelAll() {
    return invoke("force_cancel_all");
  },
};
