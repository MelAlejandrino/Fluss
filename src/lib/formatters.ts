export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatSpeed(bytesPerSecond?: number): string {
  if (bytesPerSecond === undefined) return "—";
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds < 0) return "—";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatEta(seconds?: number): string {
  if (seconds === undefined || seconds < 0) return "—";
  if (seconds < 60) return `~${Math.round(seconds)}s remaining`;
  const m = Math.round(seconds / 60);
  return `~${m}m remaining`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
