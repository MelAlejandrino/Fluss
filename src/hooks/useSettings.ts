import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUpdate } from "@/hooks/useUpdate";
import { api } from "@/lib/api";
import { notify } from "@/lib/toast";
import { REPO_URL, DEVELOPER } from "@/lib/appInfo";

export function useSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const engine = useSettingsStore((s) => s.engine);
  const appVersion = useSettingsStore((s) => s.appVersion);
  const { check } = useUpdate();

  async function chooseDefaultDirectory() {
    const picked = await api.pickDirectory(settings.defaultDownloadDirectory);
    if (picked) update("defaultDownloadDirectory", picked);
  }

  function openRepository() {
    api.openUrl(REPO_URL).catch(() => notify("Couldn't open the link.", "error"));
  }

  return {
    settings,
    update,
    engine,
    appVersion,
    developer: DEVELOPER,
    repoUrl: REPO_URL,
    chooseDefaultDirectory,
    openRepository,
    checkForUpdates: () => check(true),
  } as const;
}

// Load persisted settings + engine versions once at app start.
export function useSettingsInit() {
  const load = useSettingsStore((s) => s.load);
  useEffect(() => {
    load();
  }, [load]);
}
