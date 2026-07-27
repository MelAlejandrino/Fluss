import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { VideoMetadata, DownloadOptions } from "@/types/media";
import type { DownloadProgressEvent, DownloadHistoryItem } from "@/types/download";
import type { Settings, EngineVersions } from "@/types/settings";

interface DownloadResult {
  filePath: string;
}

// Distinct signal the Rust side returns when the user cancelled (vs. a failure).
export const CANCELLED = "__CANCELLED__";

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
};
