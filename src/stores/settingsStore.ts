import { create } from "zustand";
import { api } from "@/lib/api";
import type { Settings, EngineVersions } from "@/types/settings";

const DEFAULTS: Settings = {
  defaultDownloadDirectory: "",
  autoStartDownloads: true,
  desktopNotifications: true,
  concurrentDownloads: 1,
  overwriteExisting: false,
  keepPartialFiles: false,
  theme: "system",
};

interface SettingsState {
  settings: Settings;
  engine: EngineVersions;
  loaded: boolean;
  load: () => Promise<void>;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULTS,
  engine: { ytDlp: "…", ffmpeg: "…" },
  loaded: false,
  load: async () => {
    const [stored, dir, engine] = await Promise.all([
      api.getSettings().catch(() => null),
      api.defaultDownloadDir().catch(() => ""),
      api.engineVersions().catch(() => ({ ytDlp: "unknown", ffmpeg: "unknown" })),
    ]);
    set({
      settings: { ...DEFAULTS, defaultDownloadDirectory: dir, ...(stored ?? {}) },
      engine,
      loaded: true,
    });
  },
  update: (key, value) => {
    const settings = { ...get().settings, [key]: value };
    set({ settings });
    api.saveSettings(settings).catch(() => {});
  },
}));
