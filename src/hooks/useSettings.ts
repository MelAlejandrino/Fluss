import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { api } from "@/lib/api";

export function useSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const engine = useSettingsStore((s) => s.engine);

  async function chooseDefaultDirectory() {
    const picked = await api.pickDirectory(settings.defaultDownloadDirectory);
    if (picked) update("defaultDownloadDirectory", picked);
  }

  return { settings, update, engine, chooseDefaultDirectory } as const;
}

// Load persisted settings + engine versions once at app start.
export function useSettingsInit() {
  const load = useSettingsStore((s) => s.load);
  useEffect(() => {
    load();
  }, [load]);
}
