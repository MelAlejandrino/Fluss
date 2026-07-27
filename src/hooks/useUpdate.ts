import { useEffect } from "react";
import { api } from "@/lib/api";
import { notify } from "@/lib/toast";
import { isNewer } from "@/lib/update";

export function useUpdate() {
  // manual=true also reports "up to date" / errors; the startup check is silent
  // unless there's actually an update.
  async function check(manual: boolean) {
    let latest;
    try {
      latest = await api.getLatestRelease();
    } catch {
      if (manual) notify("Couldn't check for updates.", "error");
      return;
    }
    if (!latest) {
      if (manual) notify("No releases published yet.", "info");
      return;
    }

    const current = await api.appVersion();
    if (isNewer(latest.version, current)) {
      notify(`Fluss ${latest.version} is available — you have ${current}.`, "info", [
        { label: "Download", primary: true, onClick: () => api.openUrl(latest.url) },
        { label: "Cancel" },
      ]);
    } else if (manual) {
      notify("You're on the latest version.", "success");
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
