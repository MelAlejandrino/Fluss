import { useState } from "react";
import type { DownloadFormat, VideoQuality } from "@/types/media";
import { useSettingsStore } from "@/stores/settingsStore";
import { api } from "@/lib/api";

export function useDownloadForm() {
  const [format, setFormat] = useState<DownloadFormat>("mp4");
  const [quality, setQuality] = useState<VideoQuality>("best");
  const [override, setOverride] = useState<string | null>(null);

  // Follows the saved default until the user picks a folder for this download.
  const settingsDir = useSettingsStore((s) => s.settings.defaultDownloadDirectory);
  const directory = override ?? settingsDir;

  async function chooseDirectory() {
    const picked = await api.pickDirectory(directory);
    if (picked) setOverride(picked);
  }

  return { format, setFormat, quality, setQuality, directory, chooseDirectory } as const;
}
