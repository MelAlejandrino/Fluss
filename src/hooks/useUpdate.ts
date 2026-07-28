import { useEffect } from "react";
import { api } from "@/lib/api";
import { notify } from "@/lib/toast";
import { RELEASES_URL } from "@/lib/appInfo";

// The updater endpoint is a `latest.json` attached to the newest published
// release, so a fresh install with no release yet — or an offline machine —
// makes `pendingUpdate` throw. That's not worth alarming anyone about on
// startup; only a manual check reports it.
export function useUpdate() {
  async function check(manual: boolean) {
    let pending;
    try {
      pending = await api.pendingUpdate();
    } catch {
      if (manual) notify("Couldn't check for updates.", "error");
      return;
    }
    if (!pending) {
      if (manual) notify("You're on the latest version.", "success");
      return;
    }

    const current = await api.appVersion();
    notify(`Fluss ${pending.version} is available — you have ${current}.`, "info", [
      { label: "Update now", primary: true, onClick: install },
      { label: "Later" },
    ]);
  }

  // ponytail: no progress bar. The toast store has no update-by-id, and the
  // installers are a few MB; add one if downloads start feeling silent.
  async function install() {
    notify("Downloading update… Fluss will restart when it's ready.", "info");
    try {
      await api.installUpdate();
    } catch {
      notify("The update couldn't be installed.", "error", [
        {
          label: "Open release page",
          primary: true,
          onClick: () => api.openUrl(RELEASES_URL),
        },
        { label: "Cancel" },
      ]);
    }
  }

  return { check } as const;
}

// Silent check once on app start.
export function useUpdateCheck() {
  const { check } = useUpdate();
  useEffect(() => {
    check(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
