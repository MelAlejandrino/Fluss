import { enqueue } from "@/lib/downloadManager";

// Thin wrapper so pages stay decoupled from the manager module.
export function useStartDownload() {
  return { start: enqueue } as const;
}
