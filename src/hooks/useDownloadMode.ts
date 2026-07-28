import { useState } from "react";

export type DownloadMode = "single" | "bulk";

/** Which of Home's two entry flows is showing. */
export function useDownloadMode() {
  const [mode, setMode] = useState<DownloadMode>("single");
  return { mode, setMode } as const;
}
