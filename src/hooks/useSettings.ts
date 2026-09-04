import { useEffect, useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUpdate } from "@/hooks/useUpdate";
import { api } from "@/lib/api";
import { notify } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import { REPO_URL, DEVELOPER } from "@/lib/appInfo";

export function useSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const engine = useSettingsStore((s) => s.engine);
  const appVersion = useSettingsStore((s) => s.appVersion);
  const refreshEngine = useSettingsStore((s) => s.refreshEngine);
  const loaded = useSettingsStore((s) => s.loaded);
  const { check } = useUpdate();
  const [updatingEngine, setUpdatingEngine] = useState(false);

  async function chooseDefaultDirectory() {
    const picked = await api.pickDirectory(settings.defaultDownloadDirectory);
    if (picked) update("defaultDownloadDirectory", picked);
  }

  /// Runs yt-dlp's own updater. Sites break extraction on their own schedule, so
  /// this is the usual fix for "it stopped working" — no reinstall needed.
  async function updateEngine() {
    if (updatingEngine) return;
    setUpdatingEngine(true);
    try {
      const result = await api.updateEngine();
      notify(result.message, result.updated ? "success" : "info");
      // The version on screen is now stale whenever something actually changed.
      if (result.updated) await refreshEngine();
    } catch (e) {
      notify(friendlyError(e, "Couldn't update the engine."), "error");
    } finally {
      setUpdatingEngine(false);
    }
  }

  /// The sign-in toggle is only meaningful when yt-dlp has a browser to read
  /// cookies from. Name the one we'd use so the setting isn't a black box, and
  /// say plainly when there's none rather than offering a switch that does
  /// nothing. Until detection has come back, assume it's fine — a "no browser"
  /// warning that turns out to be wrong is worse than a beat of vagueness.
  const browser = engine.cookieBrowser;
  const browserSignIn = {
    available: !loaded || browser !== null,
    hint: browser
      ? `Turn this on if a site says it can't verify you. Fluss uses your ${titleCase(browser)} sign-in.`
      : loaded
        ? "Needs a supported browser — Firefox, Chrome, Edge, Brave, Vivaldi, Opera or Chromium — installed on this device."
        : "Turn this on if a site says it can't verify you. Fluss uses the browser you're already signed in with.",
  };

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
    updateEngine,
    updatingEngine,
    browserSignIn,
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

function titleCase(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
