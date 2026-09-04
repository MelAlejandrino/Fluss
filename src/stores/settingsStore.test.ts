import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSettingsStore } from "./settingsStore";
import { useToastStore } from "@/stores/toastStore";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    getSettings: vi.fn(),
    saveSettings: vi.fn(() => Promise.resolve()),
    defaultDownloadDir: vi.fn(() => Promise.resolve("C:/Users/x/Videos")),
    engineVersions: vi.fn(() => Promise.resolve({ ytDlp: "2025.1.1", ffmpeg: "7.1" })),
    appVersion: vi.fn(() => Promise.resolve("0.4.0")),
  },
}));

const settle = () => new Promise((r) => setTimeout(r, 0));

describe("settingsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({ unreadable: false, loaded: false });
    useToastStore.setState({ toasts: [] });
  });

  it("applies stored settings over the defaults", async () => {
    vi.mocked(api.getSettings).mockResolvedValue({ theme: "dark" } as never);
    await useSettingsStore.getState().load();
    const { settings } = useSettingsStore.getState();
    expect(settings.theme).toBe("dark");
    expect(settings.autoStartDownloads).toBe(true); // default fills the rest
  });

  it("treats no stored file as a normal first run", async () => {
    // Rust returns null when nothing has been saved — not an error.
    vi.mocked(api.getSettings).mockResolvedValue(null);
    await useSettingsStore.getState().load();
    expect(useSettingsStore.getState().unreadable).toBe(false);
    expect(useToastStore.getState().toasts).toHaveLength(0);
    // The OS Videos folder becomes the default output location.
    expect(useSettingsStore.getState().settings.defaultDownloadDirectory).toBe(
      "C:/Users/x/Videos",
    );

    useSettingsStore.getState().update("theme", "light");
    await settle();
    expect(api.saveSettings).toHaveBeenCalled();
  });

  it("falls back to the OS folder when the saved one is blank", async () => {
    // Written by a settings change that landed before the first load finished.
    // Without the fallback every download asks for a folder from then on.
    vi.mocked(api.getSettings).mockResolvedValue({ defaultDownloadDirectory: "" } as never);
    await useSettingsStore.getState().load();
    expect(useSettingsStore.getState().settings.defaultDownloadDirectory).toBe(
      "C:/Users/x/Videos",
    );
  });

  it("never overwrites a damaged file", async () => {
    vi.mocked(api.getSettings).mockRejectedValue("expected value at line 1");
    await useSettingsStore.getState().load();
    expect(useSettingsStore.getState().unreadable).toBe(true);
    // Defaults are fine to *show*; writing them over the real file is not.
    expect(useSettingsStore.getState().settings.theme).toBe("system");

    useSettingsStore.getState().update("theme", "dark");
    await settle();
    expect(api.saveSettings).not.toHaveBeenCalled();
    // The change still applies for this session.
    expect(useSettingsStore.getState().settings.theme).toBe("dark");
  });

  it("offers Start fresh, which re-enables saving", async () => {
    vi.mocked(api.getSettings).mockRejectedValue("bad json");
    await useSettingsStore.getState().load();

    const toast = useToastStore.getState().toasts[0];
    expect(toast.tone).toBe("error");
    const startFresh = toast.actions?.find((a) => a.label === "Start fresh");
    expect(startFresh).toBeDefined();

    startFresh!.onClick!();
    useSettingsStore.getState().update("theme", "dark");
    await settle();
    expect(api.saveSettings).toHaveBeenCalledOnce();
  });
});
