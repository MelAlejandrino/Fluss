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
import { check as checkForUpdate } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import type { VideoMetadata, DownloadOptions } from "@/types/media";
import type { DownloadProgressEvent, DownloadMetaEvent, DownloadHistoryItem } from "@/types/download";
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

  onDownloadMeta(handler: (event: DownloadMetaEvent) => void) {
    return listen<DownloadMetaEvent>("download-meta", (e) => handler(e.payload));
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

  // A pending signed update, or null when we're already current. The plugin
  // does the version comparison and signature check against `latest.json`.
  async pendingUpdate(): Promise<{ version: string } | null> {
    const update = await checkForUpdate();
    return update ? { version: update.version } : null;
  },

  // Downloads, verifies and installs the pending update, then restarts into it.
  // Re-checks rather than holding the handle from `pendingUpdate` — one extra
  // fetch of a tiny JSON file, and no Tauri object escapes this module.
  async installUpdate(): Promise<void> {
    const update = await checkForUpdate();
    if (!update) return;
    await update.downloadAndInstall();
    await relaunch();
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
