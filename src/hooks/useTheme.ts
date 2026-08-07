import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

// Stamp data-theme on <html>; the dark palette in index.css keys off it.
export function useTheme() {
  const theme = useSettingsStore((s) => s.settings.theme);
  const loaded = useSettingsStore((s) => s.loaded);

  useEffect(() => {
    // Until real settings load, leave the theme the pre-paint script set from
    // localStorage — otherwise the default "system" would override it and flash.
    if (!loaded) return;

    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      root.dataset.theme = dark ? "dark" : "light";
      // Mirrors --color-app so the native window edge matches the app before
      // and during paint. Keep in sync with index.css and the pre-paint script.
      root.style.backgroundColor = dark ? "oklch(0.172 0.006 152)" : "oklch(0.949 0.004 152)";
    };
    localStorage.setItem("fluss-theme", theme);
    apply();
    if (theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme, loaded]);
}
