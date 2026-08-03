import { create } from "zustand";
import { api } from "@/lib/api";
import { persist, reportUnreadable } from "@/lib/persist";
import type { Settings, EngineVersions } from "@/types/settings";

const DEFAULTS: Settings = {
  defaultDownloadDirectory: "",
  autoStartDownloads: true,
  desktopNotifications: true,
  concurrentDownloads: 1,
  overwriteExisting: false,
  keepPartialFiles: false,
  useBrowserCookies: false,
  minimizeToTray: false,
  theme: "system",
};

interface SettingsState {
  settings: Settings;
  engine: EngineVersions;
  appVersion: string;
  loaded: boolean;
  /// The file on disk is damaged — saves are suspended so we don't destroy it.
  unreadable: boolean;
  load: () => Promise<void>;
  /// Re-reads just the engine versions — after a self-update the displayed
  /// number is stale, and a full `load()` would re-run the settings-file repair
  /// prompt as a side effect.
  refreshEngine: () => Promise<void>;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

/// Distinguishes "no settings saved yet" (null, the normal first run) from
/// "the file is there but won't parse".
const UNREADABLE = Symbol("unreadable");

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULTS,
  engine: { ytDlp: "…", ffmpeg: "…" },
  appVersion: "",
  loaded: false,
  unreadable: false,
  load: async () => {
    const [stored, dir, engine, appVersion] = await Promise.all([
      api.getSettings().catch(() => UNREADABLE),
      api.defaultDownloadDir().catch(() => ""),
      api.engineVersions().catch(() => ({ ytDlp: "unknown", ffmpeg: "unknown" })),
      api.appVersion().catch(() => ""),
    ]);
    const unreadable = stored === UNREADABLE;
    set({
      settings: {
        ...DEFAULTS,
        defaultDownloadDirectory: dir,
        ...(unreadable ? {} : (stored as Settings | null) ?? {}),
      },
      engine,
      appVersion,
      loaded: true,
      unreadable,
    });
    // Falling back to defaults is fine; overwriting the file is not — the user
    // would lose their real settings to a save they never knew failed.
    if (unreadable) reportUnreadable("settings", () => set({ unreadable: false }));
  },
  refreshEngine: async () => {
    const engine = await api.engineVersions().catch(() => get().engine);
    set({ engine });
  },
  update: (key, value) => {
    const settings = { ...get().settings, [key]: value };
    set({ settings });
    if (get().unreadable) return; // in-memory only until they choose
    persist("settings", () => api.saveSettings(settings));
  },
}));
